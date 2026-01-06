import { emailConfig } from "../config"

export function contractCreatedTemplate(
  name: string,
  vehicleReg: string,
  amount: string,
  frequency: string,
) {
  const dashboardUrl = `${emailConfig.baseUrl}/driver`
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🚗 Vehicle Assigned!</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Congratulations, ${name}!</h2>
        
        <p style="color: #666; font-size: 16px;">
          A vehicle has been assigned to you and your rental contract has been created.
        </p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 8px 0; font-size: 18px;"><strong>Vehicle:</strong> <span style="color: #111;">${vehicleReg}</span></p>
          <p style="margin: 8px 0;"><strong>Rental Fee:</strong> R ${amount} per ${frequency.toLowerCase()}</p>
        </div>
        
        <p style="color: #666; font-size: 16px;">
          You can now view your contract and payment schedule in your dashboard.
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

