import { emailConfig } from "../config"

export function activationEmailTemplate(name: string, activationLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #111; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Welcome to ${emailConfig.appName}!</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          Your driver account has been created. To get started, please activate your account by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Activate Account
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This activation link will expire in <strong>7 days</strong>.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          If you did not request this account, please ignore this email or contact our support team.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

