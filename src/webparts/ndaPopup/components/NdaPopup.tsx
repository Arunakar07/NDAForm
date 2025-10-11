import * as React from 'react';
//import styles from './NdaPopup.module.scss';
import type { INdaPopupProps } from './INdaPopupProps';
//import { escape } from '@microsoft/sp-lodash-subset';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-users/web";
import "@pnp/sp/folders";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/profiles";

export interface INDAPopupState {
  showDialog: boolean;
  pathIsProtected: boolean;
  matchedPath?: string;
}

export default class NdaPopup extends React.Component<INdaPopupProps, INDAPopupState> {
  private currentPath: string;
  private userEmail: string;
  private userName: string;
  sp: any;
  constructor(props: INdaPopupProps) {
    super(props);

    this.state = {
      showDialog: false,
      pathIsProtected: false,
      matchedPath: undefined
    };

    // this.currentPath = this.props.context.pageContext.site.serverRequestPath.toLowerCase();

    this.sp = spfi().using(SPFx(this.props.context));

    this.userEmail = this.props.context.pageContext.user.email;
    this.userName = this.props.context.pageContext.user.displayName;

    // Normalize current path (handle ?id=, folder paths, etc.)
   // const url = window.location.href.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");

    if (idParam) {
      this.currentPath = decodeURIComponent(idParam).toLowerCase();
    } else {
      this.currentPath = decodeURIComponent(window.location.pathname).toLowerCase();
    }

    console.log("Current Path:", this.currentPath);

  }

  public async componentDidMount(): Promise<void> {
    try {
      const ndaPaths = await this.sp.web.lists.getByTitle("NDASharedPaths").items()
        .select("Title", "Path")();

      // Use Path if exists, else Title
      const protectedPaths = ndaPaths.map((item: any) =>
        decodeURIComponent((item.Path || item.Title || "").toLowerCase())
      );

      console.log("✅ Protected NDA Paths:", protectedPaths);

      // Match folder path or subfolder path
      const matchedPath = protectedPaths.find((p: string) =>
        this.currentPath === p || this.currentPath.startsWith(p + "/")
      );

      if (!matchedPath) {
        console.warn("🚫 Path not protected, redirecting to home...");
        window.location.href = this.props.context.pageContext.web.absoluteUrl;
        return;
      }

      this.setState({ pathIsProtected: true, matchedPath });

      const responses = await this.sp.web.lists.getByTitle("NDAResponses").items();

      const hasResponded = responses.some((r: any) =>
        r.Email?.toLowerCase() === this.userEmail &&
        decodeURIComponent(r.Path?.toLowerCase() || "") === matchedPath &&
        r.NDAAccepted === "true"
      );

      if (!hasResponded) {
        console.log("⚠️ NDA not accepted yet, showing popup");
        this.setState({ showDialog: true });
      } else {
        console.log("✅ NDA already accepted, no popup");
      }

    } catch (error) {
      console.error("Error checking NDA path or response:", error);
    }
  }


  private handleAccept = async () => {
    try {
      await this.sp.web.lists.getByTitle("NDAResponses").items.add({
        Name: this.userName,
        Email: this.userEmail,
        Path: this.state.matchedPath || this.currentPath,
        NDAAccepted: "true",
        Timestamp: new Date().toISOString()
      });

      console.log("✅ NDA accepted and saved");
      this.setState({ showDialog: false });
    } catch (error) {
      console.error("❌ Error saving acceptance:", error);
    }
  }

  private handleReject = async () => {
    try {
      await this.sp.web.lists.getByTitle("NDAResponses").items.add({
        Name: this.userName,
        Email: this.userEmail,
        Path: this.state.matchedPath || this.currentPath,
        NDAAccepted: "false",
        Timestamp: new Date().toISOString()
      });

      console.warn("🚫 NDA rejected, redirecting to home...");
      window.location.href = this.props.context.pageContext.web.absoluteUrl;
    } catch (error) {
      console.error("❌ Error saving rejection:", error);
    }
  }

  public render(): React.ReactElement<INdaPopupProps> {
    return (
      <Dialog
        hidden={!this.state.showDialog
        }
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: 'Non-Disclosure Agreement',
          subText: 'You must accept the NDA to access this content.'
        }}
        modalProps={{ isBlocking: true }}
      >
        <p>Please read and accept the NDA to continue.</p>
        <DialogFooter>
          <PrimaryButton onClick={this.handleAccept} text="Accept" />
          <DefaultButton onClick={this.handleReject} text="Reject" />
        </DialogFooter>
      </Dialog >
    );
  }


}
