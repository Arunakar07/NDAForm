import * as React from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';

export interface INDAModalProps {
  onAccept: () => void;
  onReject: () => void;
}
const ensureDialogCSS = () => {
  const styleId = "nda-dialog-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .ms-Dialog-main {
        width: 900px !important;
        max-width: 900px !important;
        min-width: 700px !important;
       
      }`;
    document.head.appendChild(style);
  }
};
ensureDialogCSS();

export default class NDAModal extends React.Component<INDAModalProps> {
  public render(): React.ReactElement<INDAModalProps> {
    return (
      <Dialog
        hidden={false}
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: 'Non-Disclosure Agreement / اتفاقية عدم الإفصاح',
          //subText: 'You must accept the NDA to access this content.'
        }}
        modalProps={{
          isBlocking: true,
          //className: "nda-dialog-main"// ✅ hook CSS class

        }}
      >
        <div style={{ maxHeight: "430px", overflowY: "auto", paddingRight: "10px" }}>
          <h3>Non-Disclosure Agreement</h3>
          <p>
            By participating in the tender evaluation process for KAHRAMAA, you
            agree to the following terms:
          </p>
          <ol>
            <li>
              <b>Confidentiality:</b> You must maintain the confidentiality of all
              information disclosed during the tender evaluation process.
            </li>
            <li>
              <b>Non-Disclosure:</b> You must not disclose any confidential
              information to third parties without prior written consent from The
              Sponsoring Department.
            </li>
            <li>
              <b>Purpose:</b> Information is solely for the purpose of evaluating
              the tender.
            </li>
          </ol>
          <p>
            By clicking <b>"I Agree"</b>, you acknowledge that you have read,
            understood, and agree to abide by these terms. Not complying may result
            in legal and/or disciplinary actions.
          </p>

          <hr />

          <h3 style={{ direction: "rtl", textAlign: "right" }}>اتفاقية عدم الإفصاح</h3>
          <p style={{ direction: "rtl", textAlign: "right" }}>
            بالمشاركة في عملية تقييم مناقصات كهرماء ، فإنك توافق على الشروط التالية:
          </p>
          <ol style={{ direction: "rtl", textAlign: "right" }}>
            <li>
              <b>السرية:</b> يجب عليك الحفاظ على سرية جميع المعلومات التي يتم الكشف
              عنها خلال عملية تقييم المناقصات.
            </li>
            <li>
              <b>عدم الإفصاح:</b> يجب عليك عدم الكشف عن أي معلومات سرية لأطراف ثالثة
              دون الحصول على موافقة خطية مسبقة من الإدارة المختصة.
            </li>
            <li>
              <b>الغرض:</b> يتم استخدام المعلومات فقط لغرض تقييم المناقصات.
            </li>
          </ol>
          <p style={{ direction: "rtl", textAlign: "right" }}>
            بالنقر على <b>"أوافق"</b>، فإنك تقر بأنك قد قرأت وفهمت وتوافق على الالتزام
            بهذه الشروط. عدم الالتزام قد يؤدي إلى اتخاذ إجراءات قانونية و/او تأديبية.
          </p>
        </div>
        <DialogFooter>
          <PrimaryButton onClick={this.props.onAccept} text="Accept" />
          <DefaultButton onClick={this.props.onReject} text="Reject" />
        </DialogFooter>
      </Dialog>
    );
  }
}
