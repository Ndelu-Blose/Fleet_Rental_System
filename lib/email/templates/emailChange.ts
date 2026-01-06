import { emailConfig } from "../config"

export function emailChangeVerificationTemplate(name: string, verificationLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #111; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Email Change Verification</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          You requested to change your email address. Please verify your new email by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This verification link will expire in <strong>24 hours</strong>.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          If you did not request this change, please contact our support team immediately.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

export function emailChangeConfirmationTemplate(name: string, oldEmail: string, newEmail: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #111; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Email Address Changed</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          This is to confirm that your email address has been successfully changed.
        </p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Old Email:</strong> ${oldEmail}</p>
          <p style="margin: 5px 0;"><strong>New Email:</strong> ${newEmail}</p>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          If you did not make this change, please contact our support team immediately at ${emailConfig.supportEmail}.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

