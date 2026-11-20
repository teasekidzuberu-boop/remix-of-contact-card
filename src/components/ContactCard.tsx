import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Copy,
  Download,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  QrCode,
  Share2,
  UserRound,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { buildVCard, vCardFileName } from "@/lib/vcard";
import { buildWhatsAppUrl, normalizePhone } from "@/lib/phone";
import { isValidExternalUrl, platformIcon, platformAriaLabel } from "@/lib/social";
import { contactDetailsText, qrTarget, safeBrandColor } from "@/lib/brand";
import type { PublicProfile, SocialLink } from "@/lib/types";

interface ContactCardProps {
  profile: PublicProfile;
  links: SocialLink[];
  /** Render inside the admin preview: no page chrome, no theme toggle. */
  preview?: boolean;
  /** Local avatar preview URL (admin). */
  avatarOverride?: string | null;
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="section-label">
      {children}
    </h2>
  );
}

const rowClass =
  "contact-row";

function Row({ icon, label, value, href, external }: { icon: ReactNode; label: string; value: string; href?: string; external?: boolean }) {
  const inner = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block break-words font-medium">{value}</span>
      </span>
      {href && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} className={rowClass} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {inner}
        </a>
      ) : (
        <div className={rowClass}>{inner}</div>
      )}
    </li>
  );
}

export default function ContactCard({ profile, links, preview, avatarOverride }: ContactCardProps) {
  const hydrated = useHydrated();
  const [saving, setSaving] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const cardUrl = hydrated ? `${window.location.origin}/p/${profile.slug}` : "";
  const qrValue = qrTarget(profile.qr_url, cardUrl);
  const brand = safeBrandColor(profile.brand_color);
  const brandStyle = {
    "--profile-accent": brand,
  } as CSSProperties;

  const phoneDigits = normalizePhone(profile.phone);
  const telHref = phoneDigits ? `tel:${profile.phone.trim().startsWith("+") ? "+" : ""}${phoneDigits}` : null;
  const smsHref = phoneDigits ? `sms:${profile.phone.trim().startsWith("+") ? "+" : ""}${phoneDigits}` : null;
  const whatsappUrl = buildWhatsAppUrl(profile.whatsapp_number, profile.whatsapp_message);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) ? profile.email.trim() : null;
  const websiteUrl = isValidExternalUrl(profile.website) ? profile.website.trim() : null;
  const safeLinks = links.filter((l) => isValidExternalUrl(l.url));
  const avatarSrc = avatarOverride ?? (profile.avatar_path ? `/api/public/profile-photo/${profile.avatar_path}` : null);

  const handleSave = () => {
    setSaving(true);
    try {
      const blob = new Blob([buildVCard(profile, safeLinks)], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, vCardFileName(profile.slug));
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success("Contact saved", { description: "Open the file to add it to your contacts." });
    } catch {
      toast.error("Could not generate the contact file");
    } finally {
      setTimeout(() => setSaving(false), 600);
    }
  };

  const handleCopyLink = async () => {
    if (!cardUrl) return;
    if (await copyText(cardUrl)) toast.success("Profile link copied");
    else toast.error("Could not copy the link", { description: cardUrl });
  };

  const handleCopyDetails = async () => {
    if (await copyText(contactDetailsText(profile, cardUrl))) toast.success("Contact details copied");
    else toast.error("Could not copy details");
  };

  const handleShare = async () => {
    if ("share" in navigator) {
      try {
        await navigator.share({ title: profile.full_name, text: profile.title, url: cardUrl });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    void handleCopyLink();
  };

  const handleQrDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    downloadUrl(canvas.toDataURL("image/png"), `${profile.slug || "card"}-qr.png`);
    toast.success("QR code downloaded");
  };

  const hasDetails = telHref || email || profile.location.trim() || websiteUrl || whatsappUrl;
  const subtitle = [profile.title, profile.organization].filter(Boolean).join(" · ");

  const body = (
    <div className="identity-layout">
      <section className="identity-intro" aria-label="Profile">
        <div className="portrait-wrap">
          {avatarSrc ? (
            <img src={avatarSrc} alt={`${profile.full_name || "Profile"} photo`} className="size-full object-cover" width={144} height={144} />
          ) : (
            <div className="portrait-placeholder"><UserRound className="size-14" aria-hidden /></div>
          )}
        </div>
        <h1 className="identity-name">{profile.full_name || "Your name"}</h1>
        {subtitle && <p className="identity-role">{subtitle}</p>}
        {profile.location.trim() && (
          <p className="identity-location"><MapPin className="size-3.5 shrink-0" aria-hidden />{profile.location}</p>
        )}
        {profile.bio.trim() && <p className="identity-bio">{profile.bio}</p>}
        <div className="identity-actions">
          <Button size="lg" onClick={handleSave} disabled={saving} className="save-contact">
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}Save Contact
          </Button>
          {whatsappUrl && (
            <Button asChild variant="outline" className="whatsapp-action">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden />WhatsApp<ArrowUpRight aria-hidden /></a>
            </Button>
          )}
          {(telHref || smsHref) && (
            <div className="quick-actions">
              {telHref && <Button asChild variant="ghost"><a href={telHref}><Phone aria-hidden />Call</a></Button>}
              {smsHref && <Button asChild variant="ghost"><a href={smsHref}><MessageSquare aria-hidden />Text</a></Button>}
            </div>
          )}
        </div>
      </section>
      <div className="identity-connections">
        {hasDetails && (
          <section className="identity-section">
            <SectionTitle>Contact</SectionTitle>
            <ul className="contact-list">
              {telHref && <Row icon={<Phone className="size-4" />} label="Phone" value={profile.phone} href={telHref} />}
              {whatsappUrl && <Row icon={<MessageCircle className="size-4" />} label="WhatsApp" value={profile.whatsapp_number} href={whatsappUrl} external />}
              {email && <Row icon={<Mail className="size-4" />} label="Email" value={email} href={`mailto:${email}`} />}
              {websiteUrl && <Row icon={<Globe className="size-4" />} label="Website" value={websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")} href={websiteUrl} external />}
              {profile.location.trim() && <Row icon={<MapPin className="size-4" />} label="Location" value={profile.location} />}
            </ul>
          </section>
        )}
        {safeLinks.length > 0 && (
          <section className="identity-section social-section">
            <SectionTitle>Social</SectionTitle>
            <nav aria-label="Social profiles" className="social-links">
              {safeLinks.map((link) => {
                const Icon = platformIcon(link.platform);
                return (
                  <Button asChild variant="outline" key={link.id ?? `${link.platform}-${link.url}`} className="social-link">
                    <a href={link.url.trim()} target="_blank" rel="noopener noreferrer" aria-label={platformAriaLabel(link.platform, link.url)}>
                      <Icon className="text-primary" aria-hidden />{link.platform}<ArrowUpRight className="text-muted-foreground" aria-hidden />
                    </a>
                  </Button>
                );
              })}
            </nav>
          </section>
        )}
        <section className="identity-section share-section">
          <SectionTitle>Scan &amp; share</SectionTitle>
          <div className="share-layout">
            <div ref={qrRef} className="qr-panel" aria-label="QR code for this contact card" role="img">
              {qrValue ? <QRCodeCanvas value={qrValue} size={132} level="M" marginSize={0} /> : <div className="flex size-[132px] items-center justify-center"><QrCode className="size-8 text-muted-foreground" aria-hidden /></div>}
            </div>
            <div className="share-actions">
              <Button variant="outline" onClick={handleShare}><Share2 aria-hidden />Share</Button>
              <Button variant="outline" onClick={handleCopyLink}><Copy aria-hidden />Copy link</Button>
              <Button variant="outline" onClick={handleCopyDetails}><ClipboardCopy aria-hidden />Details</Button>
              <Button variant="outline" onClick={handleQrDownload} disabled={!qrValue}><Download aria-hidden />QR</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  if (preview) return <div style={brandStyle} className="identity-preview">{body}</div>;

  return (
    <div style={brandStyle} className="identity-page fade-in">
      <div className="identity-shell rise">
        <header className="identity-header">
          <span className="brand-lockup"><span className="brand-symbol"><Sparkles className="size-5" aria-hidden /></span><span>Luxe<span className="text-primary">Card</span></span></span>
          <ThemeToggle />
        </header>
        <main>{body}</main>
        <footer className="identity-footer">
          © {new Date().getFullYear()} {profile.full_name} · LuxeCard ·{" "}
          <a href="/admin/login" className="underline-offset-2 hover:text-primary hover:underline">Admin</a>
        </footer>
      </div>
    </div>
  );
}
