import { override } from '@microsoft/decorators';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import NDAModal from './components/NDAModal';

export interface INdaExtensionApplicationCustomizerProperties { }

export default class NdaExtensionApplicationCustomizer
  extends BaseApplicationCustomizer<INdaExtensionApplicationCustomizerProperties> {

  private _sp: any;

  @override
  public async onInit(): Promise<void> {
    this._sp = spfi().using(SPFx(this.context));

    // Run immediately and also check on navigation change
    this._checkNDAPath();
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this._checkNDAPath();
      }
    }, 1000);

    return Promise.resolve();
  }

  /** Checks if current path is NDA-protected */
  private _checkNDAPath = async (): Promise<void> => {
    try {
      const currentUrl = window.location.href.toLowerCase();

      // ⛔ Skip system/list/admin pages
      if (
        currentUrl.includes("/lists/ndasharedpaths") ||
        currentUrl.includes("/lists/ndaresponses") ||
        currentUrl.includes("/_layouts/") ||
        currentUrl.includes("/_catalogs/") ||
        currentUrl.includes("/sitepages/") ||
        currentUrl.includes("/siteassets/")
      ) return;

      // Get folder path from query string ?id=
      const urlParams = new URLSearchParams(window.location.search);
      const idParam = decodeURIComponent(urlParams.get("id") || "").trim().toLowerCase();
      const currentPath = idParam || decodeURIComponent(window.location.pathname.toLowerCase());

      console.log("📂 Checking NDA for path:", currentPath);

      // 🔹 Fetch NDA shared paths
      const ndaItems = await this._sp.web.lists.getByTitle("NDASharedPaths").items.select("Path")();

      // 🔹 Match exact path only
      const matchedItem = ndaItems.find((item: any) => {
        const ndaPath = decodeURIComponent(item.Path?.toLowerCase() || "").trim();
        return ndaPath === currentPath;
      });

      if (!matchedItem) {
        console.log("🚫 No exact NDA path match — skipping popup.");
        return;
      }

      // 🔹 Check if current user already accepted/rejected for this exact path
      const email = this.context.pageContext.user.email?.toLowerCase();
      const responses = await this._sp.web.lists.getByTitle("NDAResponses")
        .items.select("Email", "Path", "NDAAccepted","ID").top(5000)();

      const hasAccepted = responses.some((r: any) =>
        r.Email?.toLowerCase() === email &&
        decodeURIComponent(r.Path?.toLowerCase() || "").trim() === currentPath &&
        r.NDAAccepted
      );

      if (!hasAccepted) {
        console.log("⚠️ NDA path matched but not accepted — showing popup.");
        this._showNDAPopup(currentPath);
      } else {
        console.log("🟢 NDA already accepted — no popup needed.");
      }

    } catch (err) {
      console.error("❌ Error while checking NDA path:", err);
    }
  }

  /** Display NDA popup */
  private _showNDAPopup(currentPath: string): void {
    if (document.getElementById("nda-dialog-container")) return;

    const container = document.createElement("div");
    container.id = "nda-dialog-container";
    document.body.appendChild(container);

    const element = React.createElement(NDAModal, {
      onAccept: async () => {
        await this._saveResponse(currentPath, true);
        this._closeNDAPopup();
        window.location.reload();
      },
      onReject: async () => {
        await this._saveResponse(currentPath, false);
        this._closeNDAPopup();
        window.location.href = this.context.pageContext.web.absoluteUrl;
      }
    });

    ReactDOM.render(element, container);
  }

  /** Save NDA response in list */
  private async _saveResponse(path: string, accepted: boolean): Promise<void> {
    try {
      await this._sp.web.lists.getByTitle("NDAResponses").items.add({
        Title: this.context.pageContext.user.displayName,
        Name: this.context.pageContext.user.displayName,
        Email: this.context.pageContext.user.email,
        Path: path,
        NDAAccepted: accepted ? "true" : "false",
        Timestamp: new Date().toISOString()
      });
      console.log(`💾 NDA ${accepted ? "Accepted" : "Rejected"} saved.`);
    } catch (err) {
      console.error("❌ Error saving NDA response:", err);
    }
  }

  /** Remove popup */
  private _closeNDAPopup(): void {
    const container = document.getElementById("nda-dialog-container");
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    }
  }
}
