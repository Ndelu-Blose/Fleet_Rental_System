import { emailConfig } from "../config"

export function paymentReminderTemplate(
  name: string,
  amount: string,
  dueDate: string,
  vehicleReg: string,
) {
  const paymentsUrl = `${emailConfig.baseUrl}/driver/payments`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f59e0b; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          This is a reminder that your rental payment is due soon.
        </p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 8px 0; font-size: 18px;"><strong>Amount:</strong> <span style="color: #111;">R ${amount}</span></p>
          <p style="margin: 8px 0;"><strong>Due Date:</strong> ${dueDate}</p>
          <p style="margin: 8px 0;"><strong>Vehicle:</strong> ${vehicleReg}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentsUrl}"
             style="display: inline-block; padding: 14px 28px; background: #111; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            View Payments
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please log in to your account to make the payment before the due date.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

export function paymentOverdueTemplate(
  name: string,
  amount: string,
  dueDate: string,
  vehicleReg: string,
) {
  const paymentsUrl = `${emailConfig.baseUrl}/driver/payments`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Payment Overdue</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #666; font-size: 16px;">
          Your rental payment is now <strong style="color: #dc2626;">overdue</strong>. Please make payment as soon as possible.
        </p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 8px 0; font-size: 18px;"><strong>Amount:</strong> <span style="color: #dc2626;">R ${amount}</span></p>
          <p style="margin: 8px 0;"><strong>Due Date:</strong> ${dueDate}</p>
          <p style="margin: 8px 0;"><strong>Vehicle:</strong> ${vehicleReg}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentsUrl}"
             style="display: inline-block; padding: 14px 28px; background: #dc2626; color: #fff; 
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Pay Now
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please log in to your account to make the payment immediately.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${emailConfig.appName}. All rights reserved.</p>
      </div>
    </div>
  `
}

