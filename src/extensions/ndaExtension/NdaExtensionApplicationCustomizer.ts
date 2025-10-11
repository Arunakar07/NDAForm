//import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer
} from '@microsoft/sp-application-base';
//import { Dialog } from '@microsoft/sp-dialog';
import { override } from '@microsoft/decorators';

import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-users/web";
import "@pnp/sp/folders";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/profiles";
import NDAModal from './components/NDAModal';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
//const LOG_SOURCE: string = 'NdaExtensionApplicationCustomizer';

/**
 * If your command set uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface INdaExtensionApplicationCustomizerProperties {
  // This is an example; replace with your own property

}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class NdaExtensionApplicationCustomizer
  extends BaseApplicationCustomizer<INdaExtensionApplicationCustomizerProperties> {
  private _sp: any;

  // Store session-based file redirect parameters
  private _ndaParams = {
    fileId: null as string | null,
    parent: null as string | null,
    viewid: null as string | null,
    returning: false
  };

  @override
  public async onInit(): Promise<void> {
    this._sp = spfi().using(SPFx(this.context));

    // Load session storage to memory
    this._ndaParams.fileId = sessionStorage.getItem("nda_fileId");
    this._ndaParams.parent = sessionStorage.getItem("nda_parent");
    this._ndaParams.viewid = sessionStorage.getItem("nda_viewid");
    this._ndaParams.returning = sessionStorage.getItem("nda_returning") === "1";

    this._handleNDAPathCheck();

    let previousUrl = window.location.href;
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== previousUrl) {
        previousUrl = currentUrl;
        this._handleNDAPathCheck();
      }
    }, 1000);
  }

  private _handleNDAPathCheck = async (): Promise<void> => {
    try {
      //const fullUrl = decodeURIComponent(window.location.href.toLowerCase());
      const currentPath = decodeURIComponent(window.location.pathname.toLowerCase());

      const urlParams = new URLSearchParams(window.location.search);
      const fileId = decodeURIComponent(urlParams.get("id") || "");
      const parent = decodeURIComponent(urlParams.get("parent") || "");
      const viewid = urlParams.get("viewid") || "";
      const isReturning = urlParams.get("nda") === "1";

      // Load NDA paths
      const ndaPaths = await this._sp.web.lists.getByTitle("NDASharedPaths").items();
      const ndaMatch = ndaPaths.find((item: any) => {
        const ndaPath = decodeURIComponent(item.Path?.toLowerCase() || "");
        return currentPath.startsWith(ndaPath) || fileId.toLowerCase().includes(ndaPath);
      });

      if (!ndaMatch) return;

      const email = this.context.pageContext.user.email;
      const responses = await this._sp.web.lists.getByTitle("NDAResponses").items();

      const hasResponded = responses.some((r: any) =>
        r.Email?.toLowerCase() === email &&
        decodeURIComponent(r.Path?.toLowerCase() || "") === currentPath &&
        r.NDAAccepted
      );

      // ✅ Redirect to folder view only if NDA not accepted yet
      if (!hasResponded && fileId && !isReturning && !this._ndaParams.returning) {
        sessionStorage.setItem("nda_fileId", fileId);
        sessionStorage.setItem("nda_parent", parent);
        sessionStorage.setItem("nda_viewid", viewid);
        sessionStorage.setItem("nda_returning", "1");

        const redirectUrl = `${window.location.pathname}?nda=1&parent=${encodeURIComponent(parent)}&viewid=${encodeURIComponent(viewid)}`;
        window.location.href = redirectUrl;
        return;
      }

      // ✅ Clear session after return from redirect
      if (isReturning && this._ndaParams.returning) {
        sessionStorage.removeItem("nda_returning");
        sessionStorage.removeItem("nda_fileId");
        sessionStorage.removeItem("nda_parent");
        sessionStorage.removeItem("nda_viewid");
      }

      // ✅ Show NDA Dialog if NDA not accepted yet
      if (!hasResponded  && !document.getElementById("nda-dialog-container")) {
        this._renderDialog();
      }

    } catch (error) {
      console.error("NDA check failed:", error);
    }
  };

  private _renderDialog(): void {
    const element = React.createElement(NDAModal, {
      onAccept: async () => {
        const currentPath = decodeURIComponent(window.location.pathname.toLowerCase());

        await this._sp.web.lists.getByTitle("NDAResponses").items.add({
          Name: this.context.pageContext.user.displayName,
          Email: this.context.pageContext.user.email,
          Path: currentPath,
          NDAAccepted: "true",
          Timestamp: new Date().toISOString()
        });

        this._removeDialog();

        // Redirect back to file after accepting
        const fileId = this._ndaParams.fileId || sessionStorage.getItem("nda_fileId");
        const parent = this._ndaParams.parent || sessionStorage.getItem("nda_parent");
        const viewid = this._ndaParams.viewid || sessionStorage.getItem("nda_viewid");

        console.log("Redirecting to file:", { fileId, parent, viewid });

        if (fileId && parent && viewid) {
          const returnUrl = `${window.location.pathname}?id=${encodeURIComponent(fileId)}&parent=${encodeURIComponent(parent)}&viewid=${encodeURIComponent(viewid)}&nda=1`;

          setTimeout(() => {
            window.location.href = returnUrl;
          }, 100);
        }
      },

      onReject: async () => {
        const currentPath = decodeURIComponent(window.location.pathname.toLowerCase());

        await this._sp.web.lists.getByTitle("NDAResponses").items.add({
          Name: this.context.pageContext.user.displayName,
          Email: this.context.pageContext.user.email,
          Path: currentPath,
          NDAAccepted: "false",
          Timestamp: new Date().toISOString()
        });

        sessionStorage.clear();
        window.location.href = this.context.pageContext.web.absoluteUrl;
      }
    });

    const container = document.createElement("div");
    container.setAttribute("id", "nda-dialog-container");
    document.body.appendChild(container);
    ReactDOM.render(element, container);
  }

  private _removeDialog(): void {
    const container = document.getElementById("nda-dialog-container");
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      setTimeout(() => {
        if (document.body.contains(container)) {
          container.remove();
        }
      }, 100);
    }
  }

}
