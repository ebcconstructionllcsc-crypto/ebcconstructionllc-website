import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://ebcconstructionllc.com", "https://www.ebcconstructionllc.com"]);
const MAX_FILES = 8;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","image/avif"]);
const headersFor = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://ebcconstructionllc.com",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json"
});
const clean = (v: FormDataEntryValue | null, max=5000) => typeof v === "string" ? v.trim().slice(0,max) : "";

const NOTIFY_EMAIL = Deno.env.get("EBC_NOTIFICATION_EMAIL") || "ebcconstructionllcsc@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EBC_FROM_EMAIL = Deno.env.get("EBC_FROM_EMAIL") || "";
const ALERT_PHONE = Deno.env.get("EBC_NOTIFICATION_PHONE") || "+18644502954";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";

const esc = (value: string) => value.replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch] || ch));

async function sendEmailAlert(details: {
  reference:string; name:string; phone:string; email:string; address:string;
  service:string; timeline:string; description:string; photos:number;
}) {
  if (!RESEND_API_KEY || !EBC_FROM_EMAIL || !NOTIFY_EMAIL) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EBC_FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject: `NEW EBC LEAD — ${details.service} — ${details.reference}`,
        html: `
          <h2>New website estimate request</h2>
          <p><strong>Reference:</strong> ${esc(details.reference)}</p>
          <p><strong>Name:</strong> ${esc(details.name)}</p>
          <p><strong>Phone:</strong> ${esc(details.phone)}</p>
          <p><strong>Email:</strong> ${esc(details.email || "Not provided")}</p>
          <p><strong>Project address:</strong> ${esc(details.address)}</p>
          <p><strong>Service:</strong> ${esc(details.service)}</p>
          <p><strong>Preferred timing:</strong> ${esc(details.timeline || "Not provided")}</p>
          <p><strong>Project details:</strong><br>${esc(details.description).replace(/\n/g,"<br>")}</p>
          <p><strong>Photos:</strong> ${details.photos}</p>
          <p>This lead is already saved in EBC OS.</p>
        `
      })
    });
    if (!response.ok) {
      console.error("lead_email_alert_failed", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("lead_email_alert_error", error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function sendSmsAlert(details: {
  reference:string; name:string; phone:string; service:string; address:string;
}) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !ALERT_PHONE) return false;
  try {
    const body = new URLSearchParams({
      To: ALERT_PHONE,
      From: TWILIO_FROM_NUMBER,
      Body: `NEW EBC LEAD: ${details.name} | ${details.service} | ${details.phone} | ${details.address} | ${details.reference}`
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method:"POST",
        headers:{
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type":"application/x-www-form-urlencoded"
        },
        body
      }
    );
    if (!response.ok) {
      console.error("lead_sms_alert_failed", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("lead_sms_alert_error", error instanceof Error ? error.message : String(error));
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = headersFor(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({error:"METHOD_NOT_ALLOWED"}), {status:405,headers});
  if (!origin || !allowedOrigins.has(origin)) return new Response(JSON.stringify({error:"ORIGIN_NOT_ALLOWED"}), {status:403,headers});

  try {
    const form = await req.formData();
    const fullName = clean(form.get("name"),160);
    const phone = clean(form.get("phone"),40);
    const email = clean(form.get("email"),254).toLowerCase();
    const address = clean(form.get("address"),300);
    const service = clean(form.get("service"),120);
    const timeline = clean(form.get("preferred_timing"),160) || clean(form.get("preferred_timeline"),160);
    const description = clean(form.get("message"),5000) || clean(form.get("project_description"),5000) || clean(form.get("project"),5000);
    const honeypot = clean(form.get("company_website"),200);
    if (honeypot) return new Response(JSON.stringify({ok:true,reference:"received",emailNotified:false,smsNotified:false}), {status:201,headers});

    const consentRaw = clean(form.get("consent_to_contact"),20).toLowerCase();
    const consent = ["true","1","yes","on","accepted"].includes(consentRaw);
    const files = form.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);

    if (!fullName || !phone || !address || !service || !description) return new Response(JSON.stringify({error:"MISSING_REQUIRED_FIELDS"}), {status:400,headers});
    if (!consent) return new Response(JSON.stringify({error:"CONTACT_CONSENT_REQUIRED"}), {status:400,headers});
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({error:"INVALID_EMAIL"}), {status:400,headers});
    if (files.length > MAX_FILES) return new Response(JSON.stringify({error:"TOO_MANY_FILES"}), {status:400,headers});
    for (const f of files) if (f.size > MAX_FILE_BYTES || !allowedTypes.has(f.type)) return new Response(JSON.stringify({error:"INVALID_FILE",file:f.name}), {status:400,headers});

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("source", "Website Lead")
      .gte("created_at", tenMinutesAgo);
    if (rateError) {
      console.error("website_lead_rate_check_failed", rateError.message);
      return new Response(JSON.stringify({error:"SUBMISSION_FAILED"}), {status:503,headers});
    }
    if ((recentCount ?? 0) >= 2) {
      return new Response(JSON.stringify({error:"TOO_MANY_REQUESTS"}), {status:429,headers});
    }
    const { data: admins, error: adminError } = await supabase.from("users").select("id").eq("role","admin").eq("is_active",true).order("created_at",{ascending:true}).limit(1);
    if (adminError || !admins?.[0]) throw adminError ?? new Error("NO_ACTIVE_ADMIN");
    const owner = admins[0].id;

    const { data: lead, error: leadError } = await supabase.from("leads").insert({
      id: crypto.randomUUID(),
      full_name: fullName, phone, email: email || null, service_type: service,
      project_address: address, project_description: description,
      preferred_timeline: timeline || null, source: "Website Lead", consent_to_contact: true,
      status: "new", next_action: "Review website request"
    }).select("id").single();
    if (leadError) throw leadError;

    const uploaded: string[] = [];
    try {
      for (let i=0;i<files.length;i++) {
        const f = files[i];
        const ext = (f.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g,"").slice(0,8) || "jpg";
        const path = `${lead.id}/${crypto.randomUUID()}-${i+1}.${ext}`;
        const { error: upErr } = await supabase.storage.from("website-leads").upload(path, f, {contentType:f.type, upsert:false});
        if (upErr) throw upErr;
        uploaded.push(path);
        const { error: fileErr } = await supabase.from("lead_files").insert({lead_id:lead.id,file_name:f.name.slice(0,255),storage_path:path,mime_type:f.type,size_bytes:f.size,source:"website"});
        if (fileErr) throw fileErr;
      }
    } catch (fileError) {
      if (uploaded.length) await supabase.storage.from("website-leads").remove(uploaded);
      await supabase.from("leads").delete().eq("id",lead.id);
      throw fileError;
    }

    const sourceText = `Direct website estimate request from ${fullName}. Service: ${service}. Project: ${description}`.slice(0,5000);
    const fingerprintData = new TextEncoder().encode(`website|${phone}|${email}|${address}|${service}|${description}`.toLowerCase());
    const digest = await crypto.subtle.digest("SHA-256", fingerprintData);
    const fingerprint = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
    const { error: radarError } = await supabase.from("lead_radar_captures").upsert({
      owner_user_id:owner, id:crypto.randomUUID(), source:"website", source_url:"https://ebcconstructionllc.com/contact.html",
      source_text:sourceText, contact_name:fullName, phone, email:email||null, location:address,
      preferred_timeline:timeline||null, notes:`Website Lead. Lead ID: ${lead.id}`, service_type:service,
      matched_services:[], territory:"primary", urgency:"soon", score:100, priority:"hot",
      suggested_response_en:"Thank the customer for contacting EBC Construction and confirm an estimate visit.",
      suggested_response_es:"Agradecer al cliente por contactar a EBC Construction y confirmar una visita de estimado.",
      fingerprint, status:"converted", version:1, created_by:owner, updated_by:owner,
      converted_lead_id:lead.id, converted_at:new Date().toISOString(), direct_contact_confirmed:true,
      source_respondable:false, contactability:"A", contact_path:"direct"
    }, {onConflict:"owner_user_id,fingerprint"});
    if (radarError) {
      console.error("lead_radar_capture_failed", radarError.message);
    }

    const reference = `EBC-${String(lead.id).slice(0, 8).toUpperCase()}`;
    const alertDetails = {
      reference, name: fullName, phone, email, address, service,
      timeline, description, photos: uploaded.length
    };
    const [emailNotified, smsNotified] = await Promise.all([
      sendEmailAlert(alertDetails),
      sendSmsAlert(alertDetails)
    ]);
    return new Response(JSON.stringify({
      ok:true, lead_id:lead.id, reference, photos:uploaded.length,
      emailNotified, smsNotified
    }), {status:201,headers});
  } catch (error) {
    console.error("submit_website_lead_failed", error);
    return new Response(JSON.stringify({error:"SUBMISSION_FAILED"}), {status:500,headers});
  }
});