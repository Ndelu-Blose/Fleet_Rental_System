import { emailConfig } from "../config"

export function documentApprovalTemplate(name: string, docType: string) {
  const profileUrl = `${emailConfig.baseUrl}/driver/profile`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">✓ Document Approved</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          Great news! Your <strong>${docType}</strong> document has been reviewed and <strong style="color: #10b981;">approved</strong>.
        </p>
        
        <p style="color: #666; font-size: 16px;">
          You can continue with your profile verification process.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${profileUrl}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            View Profile
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

export function documentRejectionTemplate(name: string, docType: string, reviewNote: string | null) {
  const profileUrl = `${emailConfig.baseUrl}/driver/profile`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Document Rejected</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          Your <strong>${docType}</strong> document has been reviewed and <strong style="color: #dc2626;">rejected</strong>.
        </p>
        
        ${reviewNote ? `
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; color: #666;"><strong>Reason:</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">${reviewNote}</p>
          </div>
        ` : ''}
        
        <p style="color: #666; font-size: 16px;">
          Please upload a new document to continue with your verification.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${profileUrl}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Upload Document
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

export function verificationCompleteTemplate(name: string) {
  const dashboardUrl = `${emailConfig.baseUrl}/driver`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Account Verified!</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Congratulations, ${name}!</h2>
        
        <p style="color: #666; font-size: 16px;">
          Your account has been verified and you are now <strong style="color: #10b981;">eligible for vehicle assignment</strong>.
        </p>
        
        <p style="color: #666; font-size: 16px;">
          An administrator will contact you soon about vehicle assignment.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            View Dashboard
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

export function verificationRejectedTemplate(name: string, note: string | null) {
  const profileUrl = `${emailConfig.baseUrl}/driver/profile`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Verification Rejected</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          Unfortunately, your account verification has been <strong style="color: #dc2626;">rejected</strong>.
        </p>
        
        ${note ? `
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; color: #666;"><strong>Reason:</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">${note}</p>
          </div>
        ` : ''}
        
        <p style="color: #666; font-size: 16px;">
          Please review your profile and documents, then contact support if you have questions.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${profileUrl}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            View Profile
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

