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
      pathIsProtected: false
    };

    this.currentPath = this.props.context.pageContext.site.serverRequestPath.toLowerCase();
    console.log(this.currentPath);
    this.userEmail = this.props.context.pageContext.user.email;
    this.userName = this.props.context.pageContext.user.displayName;

    this.sp = spfi().using(SPFx(this.props.context));

  }

  public async componentDidMount(): Promise<void> {
  try {
    const ndaPaths = await this.sp.web.lists.getByTitle("NDASharedPaths").items();

    const matchedPath = ndaPaths.find((item:any) => 
      item.Path?.toLowerCase() === this.currentPath
    );

    if (matchedPath) {
      this.setState({ pathIsProtected: true });

      const responses = await this.sp.web.lists.getByTitle("NDAResponses").items();

      const hasResponded = responses.some((item:any) =>
        item.Email?.toLowerCase() === this.userEmail &&
        item.Path?.toLowerCase() === this.currentPath && item.NDAAccepted
      );

      if (!hasResponded) {
        this.setState({ showDialog: true });
      }
    }
  } catch (error) {
    console.error("Error checking NDA path or response:", error);
  }
}


  private handleAccept = async () => {
    await this.sp.web.lists.getByTitle("NDAResponses").items.add({
      Name: this.userName,
      Email: this.userEmail,
      Path: this.currentPath,
      NDAAccepted: "true",
      Timestamp: new Date().toISOString()
    });

    this.setState({ showDialog: false });
  }

  private handleReject = async () => {
    await this.sp.web.lists.getByTitle("NDAResponses").items.add({
      Name: this.userName,
      Email: this.userEmail,
      Path: this.currentPath,
      NDAAccepted: "false",
      Timestamp: new Date().toISOString()
    });

    window.location.href = this.props.context.pageContext.web.absoluteUrl;
  }

  public render(): React.ReactElement<INdaPopupProps> {
    return (
      <Dialog
        hidden={!this.state.showDialog}
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
      </Dialog>
    );
  }


}
