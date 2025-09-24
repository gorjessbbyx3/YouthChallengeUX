
const fetch = require('node-fetch');

class NeoEmailService {
  constructor() {
    this.baseUrl = 'https://api.neo.tech/v1';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ycacrm.com';
    this.apiKey = process.env.NEO_API_KEY;
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || text,
          text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
        })
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', { to, subject });
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      // Fallback to console log for development
      console.log('EMAIL FALLBACK:', { to, subject, html: html || text });
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmail(emails) {
    try {
      const response = await fetch(`${this.baseUrl}/email/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          emails: emails.map(email => ({
            from: this.fromEmail,
            ...email,
            to: Array.isArray(email.to) ? email.to : [email.to]
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Bulk email API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Bulk email sent successfully: ${emails.length} emails`);
      return result;
    } catch (error) {
      console.error('Error sending bulk email:', error);
      // Fallback to individual sends
      const results = [];
      for (const email of emails) {
        results.push(await this.sendEmail(email));
      }
      return { success: true, results, fallback: true };
    }
  }

  // Template methods for common email types
  async sendEventReminder(eventData, recipients) {
    const subject = `Event Reminder: ${eventData.title}`;
    const html = this.getEventReminderTemplate(eventData);
    
    return this.sendEmail({
      to: recipients,
      subject,
      html
    });
  }

  async sendParentNotification(cadetName, message, parentEmail) {
    const subject = `Update about ${cadetName}`;
    const html = this.getParentNotificationTemplate(cadetName, message);
    
    return this.sendEmail({
      to: parentEmail,
      subject,
      html
    });
  }

  async sendStaffScheduleReminder(staffData, scheduleData) {
    const subject = 'Schedule Reminder - Your Upcoming Assignments';
    const html = this.getScheduleReminderTemplate(staffData, scheduleData);
    
    return this.sendEmail({
      to: staffData.email,
      subject,
      html
    });
  }

  // Email templates
  getEventReminderTemplate(eventData) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Event Reminder: ${eventData.title}</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>📅 Date:</strong> ${new Date(eventData.start_date).toLocaleDateString()}</p>
          <p><strong>🕐 Time:</strong> ${new Date(eventData.start_date).toLocaleTimeString()}</p>
          <p><strong>📍 Location:</strong> ${eventData.location || 'TBD'}</p>
          <p><strong>🏷️ Type:</strong> ${eventData.event_type}</p>
          ${eventData.description ? `<p><strong>📝 Description:</strong> ${eventData.description}</p>` : ''}
        </div>
        <p style="margin-top: 20px;">Please arrive on time and prepared.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">YCA CRM - Hawaii National Guard Youth Challenge Academy</p>
      </div>
    `;
  }

  getParentNotificationTemplate(cadetName, message) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Update about ${cadetName}</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          ${message}
        </div>
        <p style="margin-top: 20px;">If you have any questions, please contact us.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">YCA CRM - Hawaii National Guard Youth Challenge Academy</p>
      </div>
    `;
  }

  getScheduleReminderTemplate(staffData, scheduleData) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Schedule Reminder</h2>
        <p>Hello ${staffData.name},</p>
        <p>This is a reminder of your upcoming schedule:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          ${scheduleData.map(item => `
            <div style="margin-bottom: 10px; padding: 10px; border-left: 3px solid #007bff;">
              <strong>${item.title}</strong><br>
              📅 ${new Date(item.date).toLocaleDateString()} at ${item.time}<br>
              📍 ${item.location || 'Main facility'}
            </div>
          `).join('')}
        </div>
        <p style="margin-top: 20px;">Please review your schedule and contact us if you have any conflicts.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">YCA CRM - Hawaii National Guard Youth Challenge Academy</p>
      </div>
    `;
  }
}

module.exports = new NeoEmailService();
