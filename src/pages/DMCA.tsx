import { useState } from "react";
import { SEO } from "../components/seo/SEO";
import { 
  ShieldAlert, 
  Mail, 
  Copy, 
  Check, 
  FileText, 
  AlertTriangle, 
  Send, 
  Scale, 
  ShieldCheck, 
  Info,
  ExternalLink
} from "lucide-react";

export function DMCA() {
  const [copied, setCopied] = useState(false);
  const contactEmail = "dmca@vezlo.xyz";
  const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent("DMCA Copyright Infringement Notice")}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8">
      <SEO
        title="DMCA / Copyright Policy | DesiredHub"
        description="Learn how to submit DMCA copyright infringement notices, counter-notifications, and content-related copyright requests to DesiredHub."
        exactTitle={true}
        url="https://www.desiredhub.xyz/dmca"
      />

      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Header / Intro Card */}
        <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            Legal & Compliance
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            DMCA / Copyright Policy
          </h1>
          
          <p className="text-xs sm:text-sm text-neutral-400 font-medium mb-6">
            Last Updated: <span className="text-neutral-200">October 6, 2026</span>
          </p>

          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed mb-6">
            DesiredHub respects the intellectual property rights of copyright owners and expects users of <strong className="text-white font-semibold">desiredhub.xyz</strong> to do the same.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-8">
            If you believe that content available on DesiredHub infringes your copyright, you may submit a DMCA Notice to our designated copyright contact at:
          </p>

          {/* Quick Action Contact Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-neutral-950/80 p-3 sm:p-4 rounded-xl border border-neutral-800/80">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-sm sm:text-base font-semibold px-2 py-1">
              <Mail className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{contactEmail}</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-medium transition-colors border border-neutral-700/60"
                title="Copy Email Address"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy Email</span>
                  </>
                )}
              </button>

              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Contact DMCA Team</span>
              </a>
            </div>
          </div>

          <p className="text-xs text-neutral-400 mt-4 italic">
            Please provide sufficient information for us to identify the copyrighted work and the material you believe is infringing.
          </p>
        </div>

        {/* Section 1: DMCA Notice / Copyright Infringement */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <FileText className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              DMCA Notice / Copyright Infringement
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            If you are a copyright owner or an authorized representative of a copyright owner and believe that material available on DesiredHub infringes your copyright, you may send a copyright infringement notification to:
          </p>

          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-sm space-y-1">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">DMCA Contact:</span>
            <a href={mailtoUrl} className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1.5 font-mono">
              {contactEmail}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            A DMCA Notice should contain enough information for us to understand the nature of the complaint and locate the allegedly infringing material.
          </p>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/90 text-xs sm:text-sm leading-relaxed space-y-2">
            <p>
              <strong className="text-amber-400">Legal Notice:</strong> Please note that knowingly submitting materially false or misleading information in a copyright infringement notification may result in legal liability, including potential liability for damages, costs, and attorneys' fees where applicable under law.
            </p>
            <p>
              Information contained in a DMCA Notice may be shared with the uploader or other parties where appropriate or required by applicable law. By submitting a DMCA Notice, you acknowledge that the information you provide may be disclosed as necessary to process the complaint.
            </p>
          </div>
        </div>

        {/* Section 2: Requirements for a DMCA Notice */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Requirements for a DMCA Notice
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            A valid copyright infringement notification should substantially include the following:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">1. Identification of copyrighted work</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Identify the copyrighted work or works that you claim have been infringed.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">2. Identification of infringing material</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Provide the URL or other information that allows us to locate the specific material on DesiredHub.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">3. Your contact information</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Provide sufficient contact information, such as your name, email address, mailing address, and telephone number where appropriate.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">4. Good-faith statement</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Include a statement that you have a good-faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or applicable law.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">5. Accuracy & authorization statement</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Include a statement that the information contained in the notification is accurate and, where applicable, that you are authorized to act on behalf of the copyright owner.
              </p>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-1">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-wider block">6. Signature</span>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Include a physical or electronic signature of the copyright owner or a person authorized to act on their behalf.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/90 text-neutral-400 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Incomplete or insufficient notices may delay our ability to process the complaint.</span>
          </div>
        </div>

        {/* Section 3: How to Submit a DMCA Notice */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <Send className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              How to Submit a DMCA Notice
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            DMCA Notices should be sent directly to our official designated copyright email:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div>
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Official DMCA Email</span>
              <span className="text-amber-400 font-mono text-base sm:text-lg font-bold">{contactEmail}</span>
            </div>

            <a
              href={mailtoUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-sm transition-all shadow-lg hover:shadow-amber-500/20 shrink-0"
            >
              <Mail className="w-4 h-4" />
              <span>Contact DesiredHub DMCA Team</span>
            </a>
          </div>

          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80 text-xs sm:text-sm space-y-2 text-neutral-300">
            <p>
              <strong className="text-white">Required Email Subject Line:</strong>
            </p>
            <div className="bg-neutral-900 px-3 py-2 rounded-lg font-mono text-amber-300 border border-neutral-800 select-all">
              DMCA Copyright Infringement Notice
            </div>
            <p className="text-neutral-400 text-xs mt-2">
              Do not send unrelated questions or general support requests to the DMCA contact unless they concern copyright or intellectual-property matters.
            </p>
          </div>
        </div>

        {/* Section 4: Counter-Notification Procedures */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <Scale className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Counter-Notification Procedures
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            If you have received a DMCA Notice concerning material that you uploaded to DesiredHub and believe that the material was removed or access to it was disabled because of mistake or misidentification, you may submit a counter-notification.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Counter-notifications should be submitted by the original uploader of the affected material or an authorized representative and sent to <strong className="text-amber-400 font-mono">{contactEmail}</strong>.
          </p>

          <div className="bg-neutral-950/60 border border-neutral-800/80 p-5 rounded-xl space-y-3">
            <h3 className="text-white font-semibold text-sm sm:text-base">A Counter-Notice should substantially include:</h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs sm:text-sm leading-relaxed pl-1">
              <li>Your full name, address, telephone number, and physical or electronic signature.</li>
              <li>Identification of the material that was removed or disabled and information about where the material appeared before it was removed or disabled.</li>
              <li>A statement made under penalty of perjury that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
              <li>A statement concerning consent to the applicable jurisdiction and acceptance of service of process, as required by applicable law.</li>
            </ol>
          </div>

          <div className="space-y-2 text-neutral-300 text-xs sm:text-sm leading-relaxed">
            <p>
              After receiving a valid Counter-Notice, DesiredHub may forward the Counter-Notice to the party that submitted the original complaint where required or permitted by applicable law.
            </p>
            <p>
              Any restoration or reinstatement of material will be handled in accordance with applicable law and the circumstances of the complaint.
            </p>
          </div>
        </div>

        {/* Section 5: False or Misleading Information */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              False or Misleading Information
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Please do not submit false, fraudulent, or misleading copyright complaints.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            If a person knowingly materially misrepresents that material or activity is infringing, or that material was removed or disabled by mistake or misidentification, that person may be subject to legal liability where applicable.
          </p>
        </div>

        {/* Section 6: Repeat Infringers */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Repeat Infringers
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            In accordance with applicable law, DesiredHub may adopt and enforce measures against users who repeatedly infringe the intellectual property rights of others.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Depending on the circumstances, DesiredHub may restrict, suspend, or terminate access to the website or particular services, or take other appropriate action against repeat infringers.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            DesiredHub may also take action against users who engage in serious or repeated violations of intellectual-property rights, whether or not the conduct constitutes repeated infringement under applicable law.
          </p>
        </div>

        {/* Section 7: Content Removal */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-white border-b border-neutral-800 pb-4">
            <FileText className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Content Removal
            </h2>
          </div>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            When we receive a sufficiently supported copyright complaint, we may review the reported material and take appropriate action, which may include removing or disabling access to the allegedly infringing material.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Submitting a complaint does not guarantee that content will be removed. We may request additional information when necessary to evaluate a complaint.
          </p>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            We reserve the right to reject incomplete, invalid, fraudulent, or otherwise insufficient complaints.
          </p>
        </div>

        {/* Section 8: Final Contact Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 md:p-10 text-center space-y-6 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">DesiredHub</h2>
            <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider">DMCA / Abuse Contact</p>
          </div>

          <div className="inline-block bg-neutral-950/80 px-6 py-3 rounded-xl border border-neutral-800">
            <span className="text-xs text-neutral-400 block mb-0.5">Email Address</span>
            <a href={mailtoUrl} className="text-lg sm:text-xl font-mono font-bold text-amber-400 hover:underline">
              {contactEmail}
            </a>
          </div>

          <div>
            <a
              href={mailtoUrl}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-base transition-all shadow-xl hover:shadow-amber-500/25"
            >
              <Send className="w-5 h-5" />
              <span>Contact DMCA / Report Copyright Issue</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
