import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendSigningRequestEmail = async (
  to: string,
  signingLink: string,
  documentTitle: string,
  workspaceName: string,
): Promise<void> => {
  await resend.emails.send({
    from: "FreelanceFlow <onboarding@resend.dev>",
    to,
    subject: `${workspaceName} has sent you a document to sign`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You have a document to sign</h2>
        <p><strong>${workspaceName}</strong> has sent you <strong>${documentTitle}</strong> for your signature.</p>
        <a href="${signingLink}"
           style="display: inline-block; background: #1e293b; color: white;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;
                  margin: 16px 0;">
          Review and Sign
        </a>
        <p style="color: #64748b; font-size: 14px;">
          This link is unique to you. Do not share it with anyone.
        </p>
      </div>
    `,
  });
};

export const sendDocumentSignedEmail = async (
  to: string,
  signerName: string,
  documentTitle: string,
): Promise<void> => {
  await resend.emails.send({
    from: "FreelanceFlow <onboarding@resend.dev>",
    to,
    subject: `${signerName} has signed ${documentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document signed</h2>
        <p><strong>${signerName}</strong> has signed <strong>${documentTitle}</strong>.</p>
        <p>Log in to FreelanceFlow to download the signed copy.</p>
      </div>
    `,
  });
};

export const sendInvoiceEmail = async (
  to: string,
  invoiceNumber: string,
  total: number,
  dueDate: string,
  paymentLink: string,
  workspaceName: string,
): Promise<void> => {
  await resend.emails.send({
    from: "FreelanceFlow <onboarding@resend.dev>",
    to,
    subject: `Invoice ${invoiceNumber} from ${workspaceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoiceNumber}</h2>
        <p>You have received an invoice from <strong>${workspaceName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; color: #64748b;">Amount Due</td>
            <td style="padding: 8px; font-weight: bold;">₹${total.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #64748b;">Due Date</td>
            <td style="padding: 8px;">${dueDate}</td>
          </tr>
        </table>
        <a href="${paymentLink}"
           style="display: inline-block; background: #1e293b; color: white;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Pay Now
        </a>
      </div>
    `,
  });
};

export const sendClientInvitationEmail = async (
  to: string,
  clientName: string,
  workspaceName: string,
  inviteLink: string,
): Promise<void> => {
  await resend.emails.send({
    from: "FreelanceFlow <onboarding@resend.dev>",
    to,
    subject: `${workspaceName} has invited you to their client portal`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to ${workspaceName}'s client portal</h2>
        <p>Hi ${clientName},</p>
        <p><strong>${workspaceName}</strong> has added you as a client on FreelanceFlow. 
        Create your account to view your documents, invoices and project assets.</p>
        <a href="${inviteLink}"
           style="display: inline-block; background: #1e293b; color: white;
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;
                  margin: 16px 0;">
          Create Account
        </a>
        <p style="color: #64748b; font-size: 14px;">
          This invitation expires in 7 days.
        </p>
      </div>
    `,
  });
};
