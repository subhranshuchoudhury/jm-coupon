// src/app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse the request body
        const { emails, subject, body, accessKey } = await request.json();

        // 2. Basic validation
        if (!emails || !Array.isArray(emails) || emails.length === 0 || !subject || !body) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: emails (array), subject, and body.' },
                { status: 400 } // Bad Request
            );
        }

        if (accessKey !== process.env.FE_ACCESS_KEY) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 403 } // Forbidden
            );
        }

        // 3. Create the Nodemailer transporter
        // We use environment variables for security (see .env.local example below)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false, // Use 'true' if your port is 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                // This is the part you requested
                // Setting this to false is INSECURE and should ONLY be for development
                rejectUnauthorized: false,
            },
        });

        // 4. Define the mail options
        const mailOptions = {
            from: process.env.SMTP_FROM, // e.g., '"Your App Name" <noreply@yourdomain.com>'
            to: emails, // Nodemailer handles the array, sending to all recipients
            subject: subject,
            html: body, // Use 'text: body' if you are sending plain text
        };

        // 5. Send the email
        await transporter.sendMail(mailOptions);

        // 6. Send a success response
        return NextResponse.json(
            { success: true, message: 'Email sent successfully.' },
            { status: 200 }
        );

    } catch (error) {
        console.error(error); // Log the error for debugging
        return NextResponse.json(
            { success: false, message: 'Failed to send email.' },
            { status: 500 } // Internal Server Error
        );
    }
}