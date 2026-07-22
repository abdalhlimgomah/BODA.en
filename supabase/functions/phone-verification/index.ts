import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers for client-side invokes
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// SHA-256 hashing helper for secure OTP storage
async function hashOtp(otp: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Device classifier helper
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) return "Mobile";
  return "Desktop";
}

// Phone formatter helper (EG & SA)
function formatPhoneNumber(phone: string, countryCode: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (countryCode === "EG") {
    // Egypt: accepts 10 or 11 digits (e.g. 01XXXXXXXXX or 1XXXXXXXXX)
    let local = cleaned;
    if (local.startsWith("0")) {
      local = local.slice(1);
    }
    return `+20${local}`;
  } else if (countryCode === "SA") {
    // Saudi: accepts 9 or 10 digits (e.g. 05XXXXXXXX or 5XXXXXXXX)
    let local = cleaned;
    if (local.startsWith("0")) {
      local = local.slice(1);
    }
    return `+966${local}`;
  }
  throw new Error("دولة غير مدعومة");
}

// Send Message helper using Twilio API
async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  to: string,
  from: string,
  body: string
): Promise<boolean> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authString = btoa(`${accountSid}:${authToken}`);
    
    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", from);
    params.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Twilio request failed: ${response.status} - ${errorText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Twilio send exception:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Initialize Supabase Client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase env configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read headers for logging
    const userAgent = req.headers.get("user-agent") || "unknown";
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const deviceType = getDeviceType(userAgent);

    const { action, phone_number, country_code, channel, otp_code, email } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 1) ACTION: SEND OTP
    if (action === "send-otp") {
      if (!phone_number || !country_code || !channel) {
        return new Response(JSON.stringify({ error: "بيانات الإدخال ناقصة" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Format E.164
      let formattedPhone: string;
      try {
        formattedPhone = formatPhoneNumber(phone_number, country_code);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Validate number format matching
      const rawNumber = phone_number.replace(/\D/g, "");
      if (country_code === "EG" && !(rawNumber.length === 10 || rawNumber.length === 11)) {
        return new Response(JSON.stringify({ error: "رقم الهاتف المصري يجب أن يكون 10 أو 11 رقمًا" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (country_code === "SA" && !(rawNumber.length === 9 || rawNumber.length === 10)) {
        return new Response(JSON.stringify({ error: "رقم الهاتف السعودي يجب أن يكون 9 أو 10 أرقام" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Duplicate Check: is phone already verified by another profile?
      const targetEmail = String(email || "").trim().toLowerCase();
      const { data: duplicateUser, error: dupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone_number", formattedPhone)
        .eq("phone_verified", true)
        .neq("email", targetEmail)
        .limit(1);

      if (dupError) console.error("Duplicate check error:", dupError);
      if (duplicateUser && duplicateUser.length > 0) {
        return new Response(JSON.stringify({ error: "هذا الرقم مرتبط بحساب آخر بالفعل." }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Fetch user profile ID if email exists
      let userId: string | null = null;
      if (targetEmail) {
        const { data: pData } = await supabase.from("profiles").select("id").eq("email", targetEmail).limit(1);
        if (pData && pData.length) {
          userId = pData[0].id;
        }
      }

      // Rate limit check: wait 60 seconds between resends
      const { data: recentOtp } = await supabase
        .from("phone_verifications")
        .select("created_at")
        .eq("phone_number", formattedPhone)
        .gt("created_at", new Date(Date.now() - 60 * 1000).toISOString())
        .limit(1);

      if (recentOtp && recentOtp.length > 0) {
        return new Response(JSON.stringify({ error: "يرجى الانتظار 60 ثانية قبل طلب رمز جديد." }), {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Hourly limit check: max 5 sends per hour per IP/Phone
      const { count: hourlySends } = await supabase
        .from("phone_verifications")
        .select("*", { count: "exact", head: true })
        .eq("phone_number", formattedPhone)
        .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (hourlySends && hourlySends >= 5) {
        return new Response(JSON.stringify({ error: "لقد تجاوزت الحد الأقصى لإرسال الرموز (5 مرات في الساعة). يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Lockout check: 7 failed attempts in the last 15 minutes
      const { data: lastVerification } = await supabase
        .from("phone_verifications")
        .select("created_at, attempts")
        .eq("phone_number", formattedPhone)
        .gt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastVerification && lastVerification.length > 0 && lastVerification[0].attempts >= 7) {
        return new Response(
          JSON.stringify({ error: "تم قفل العملية بسبب محاولات خاطئة كثيرة. يرجى المحاولة بعد 15 دقيقة." }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashOtp(otp);

      // Twilio credentials
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
      const smsSender = Deno.env.get("TWILIO_SMS_SENDER") || "";
      const whatsappSender = Deno.env.get("TWILIO_WHATSAPP_SENDER") || "";

      if (!twilioSid || !twilioAuthToken) {
        return new Response(JSON.stringify({ error: "إعدادات Twilio غير متوفرة في السيرفر" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      let finalChannel = channel;
      let fallbackUsed = false;
      let sentOk = false;

      const whatsappBody = `متجر Buda\nرمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق.\nلا تشارك هذا الرمز مع أي شخص.`;
      const smsBody = `Your verification code is ${otp}. Valid for 5 minutes. Never share this code.`;

      // Log request
      await supabase.from("phone_verification_logs").insert({
        user_id: userId,
        phone_number: formattedPhone,
        action: "send_request",
        channel: finalChannel,
        ip_address: clientIp,
        device_type: deviceType,
        user_agent: userAgent,
      });

      // Send execution
      if (channel === "whatsapp") {
        if (!whatsappSender) {
          console.warn("Missing TWILIO_WHATSAPP_SENDER, falling back to SMS");
          fallbackUsed = true;
          finalChannel = "sms";
        } else {
          sentOk = await sendTwilioMessage(
            twilioSid,
            twilioAuthToken,
            `whatsapp:${formattedPhone}`,
            whatsappSender.startsWith("whatsapp:") ? whatsappSender : `whatsapp:${whatsappSender}`,
            whatsappBody
          );
        }

        // Auto fallback to SMS if WhatsApp failed
        if (!sentOk && finalChannel === "whatsapp") {
          console.warn("WhatsApp send failed. Falling back to SMS...");
          fallbackUsed = true;
          finalChannel = "sms";
          await supabase.from("phone_verification_logs").insert({
            user_id: userId,
            phone_number: formattedPhone,
            action: "send_fail",
            channel: "whatsapp",
            ip_address: clientIp,
            device_type: deviceType,
            user_agent: userAgent,
            error_message: "WhatsApp failed, falling back to SMS",
          });
        }
      }

      if (finalChannel === "sms" || fallbackUsed) {
        sentOk = await sendTwilioMessage(twilioSid, twilioAuthToken, formattedPhone, smsSender, smsBody);
      }

      if (!sentOk) {
        await supabase.from("phone_verification_logs").insert({
          user_id: userId,
          phone_number: formattedPhone,
          action: "send_fail",
          channel: finalChannel,
          ip_address: clientIp,
          device_type: deviceType,
          user_agent: userAgent,
          error_message: "Twilio send message failed",
        });
        return new Response(JSON.stringify({ error: "فشل إرسال رمز التحقق. يرجى مراجعة الرقم والمحاولة لاحقاً." }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Log Success
      await supabase.from("phone_verification_logs").insert({
        user_id: userId,
        phone_number: formattedPhone,
        action: fallbackUsed ? "send_success_fallback" : "send_success",
        channel: finalChannel,
        ip_address: clientIp,
        device_type: deviceType,
        user_agent: userAgent,
      });

      // Save to verifications table
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error: dbError } = await supabase.from("phone_verifications").insert({
        user_id: userId,
        phone_number: formattedPhone,
        country_code: country_code,
        otp_code: hashedOtp,
        channel: finalChannel,
        expires_at: expiresAt,
        attempts: 0,
      });

      if (dbError) {
        console.error("DB Insert Verification error:", dbError);
        return new Response(JSON.stringify({ error: "فشل حفظ رمز التحقق في السيرفر" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          channel: finalChannel,
          fallback: fallbackUsed,
          message: "تم إرسال رمز التحقق بنجاح",
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2) ACTION: VERIFY OTP
    if (action === "verify-otp") {
      if (!phone_number || !country_code || !otp_code || !email) {
        return new Response(JSON.stringify({ error: "بيانات التحقق غير مكتملة" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      let formattedPhone: string;
      try {
        formattedPhone = formatPhoneNumber(phone_number, country_code);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const targetEmail = email.trim().toLowerCase();
      // Fetch user profile ID if email exists
      let userId: string | null = null;
      const { data: pData } = await supabase.from("profiles").select("id").eq("email", targetEmail).limit(1);
      if (pData && pData.length) {
        userId = pData[0].id;
      }

      // Find the latest active OTP for this phone number
      const { data: activeOtps, error: fetchErr } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone_number", formattedPhone)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchErr || !activeOtps || activeOtps.length === 0) {
        await supabase.from("phone_verification_logs").insert({
          user_id: userId,
          phone_number: formattedPhone,
          action: "verify_fail",
          ip_address: clientIp,
          device_type: deviceType,
          user_agent: userAgent,
          error_message: "Expired or not found OTP",
        });
        return new Response(JSON.stringify({ error: "انتهت صلاحية الرمز أو لم يتم العثور عليه. اطلب كود جديد." }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const activeOtpRecord = activeOtps[0];

      // Lockout check
      if (activeOtpRecord.attempts >= 7) {
        await supabase.from("phone_verification_logs").insert({
          user_id: userId,
          phone_number: formattedPhone,
          action: "lockout",
          ip_address: clientIp,
          device_type: deviceType,
          user_agent: userAgent,
          error_message: "Max attempts reached lockout",
        });
        return new Response(
          JSON.stringify({ error: "تم قفل العملية بسبب محاولات خاطئة كثيرة. يرجى المحاولة بعد 15 دقيقة." }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      const inputHashed = await hashOtp(otp_code.trim());

      if (activeOtpRecord.otp_code === inputHashed) {
        // OTP matches!
        
        // Update verification record
        await supabase
          .from("phone_verifications")
          .update({ used_at: new Date().toISOString() })
          .eq("id", activeOtpRecord.id);

        // Delete all other unused verifications for this number to clean up
        await supabase
          .from("phone_verifications")
          .delete()
          .eq("phone_number", formattedPhone)
          .is("used_at", null);

        // Update user profile in Supabase
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            phone: formattedPhone,
            phone_number: formattedPhone,
            phone_country: country_code,
            phone_verified: true,
            verified_at: new Date().toISOString(),
          })
          .eq("email", targetEmail);

        if (profileErr) {
          console.error("Profile update error during OTP success:", profileErr);
          return new Response(JSON.stringify({ error: "نجح التحقق ولكن فشل تحديث بيانات الحساب" }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        // Audit log
        await supabase.from("phone_verification_logs").insert({
          user_id: userId,
          phone_number: formattedPhone,
          action: "verify_success",
          channel: activeOtpRecord.channel,
          ip_address: clientIp,
          device_type: deviceType,
          user_agent: userAgent,
        });

        return new Response(JSON.stringify({ success: true, message: "تم التحقق من رقم الهاتف وحفظه بنجاح!" }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } else {
        // Wrong OTP
        const newAttempts = activeOtpRecord.attempts + 1;
        await supabase
          .from("phone_verifications")
          .update({ attempts: newAttempts })
          .eq("id", activeOtpRecord.id);

        if (newAttempts >= 7) {
          await supabase.from("phone_verification_logs").insert({
            user_id: userId,
            phone_number: formattedPhone,
            action: "lockout",
            ip_address: clientIp,
            device_type: deviceType,
            user_agent: userAgent,
            error_message: "Reached 7 attempts lockout",
          });
          return new Response(
            JSON.stringify({
              error: "تم قفل العملية بسبب محاولات خاطئة كثيرة. يرجى المحاولة بعد 15 دقيقة.",
              locked: true,
            }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }

        await supabase.from("phone_verification_logs").insert({
          user_id: userId,
          phone_number: formattedPhone,
          action: "verify_fail",
          channel: activeOtpRecord.channel,
          ip_address: clientIp,
          device_type: deviceType,
          user_agent: userAgent,
          error_message: `Wrong OTP, attempt #${newAttempts}`,
        });

        return new Response(
          JSON.stringify({
            error: "رمز التحقق غير صحيح.",
            attempts_left: 7 - newAttempts,
          }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Deno function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
