import { SEO } from "../components/seo/SEO";

export function DMCA() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16 min-h-screen">
      <SEO
        title="DMCA Policy - DesiredHub"
        description="DMCA Notice and Takedown Policy for DesiredHub."
        exactTitle={true}
      />
      <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-neutral-300 prose-a:text-red-500 hover:prose-a:text-red-400">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">DMCA</h1>
        <p>
          DesiredHub respects the intellectual property rights of others and complies with the Notice and Takedown provisions of the Digital Millennium Copyright Act ("DMCA"), 17 U.S.C. § 512.
        </p>
        <p>
          DesiredHub qualifies as a "Service Provider" under the DMCA and is entitled to the protections provided under the DMCA safe harbor provisions. We are committed to responding promptly to valid copyright infringement notices and taking appropriate action where necessary.
        </p>
        <p>
          By using DesiredHub, you acknowledge and agree to the terms of this DMCA Policy.
        </p>

        <hr className="border-neutral-800 my-8" />

        <h2 className="text-2xl md:text-3xl font-semibold mt-12 mb-6">Notice of Claimed Copyright Infringement</h2>
        <p>
          If you believe that any material available on DesiredHub infringes your copyright, please send a written notification containing the following information:
        </p>
        
        <ul className="list-none space-y-4 my-6 p-0">
          <li><strong>(a)</strong> A physical or electronic signature of the copyright owner or a person authorized to act on behalf of the copyright owner.</li>
          <li><strong>(b)</strong> Identification of the copyrighted work claimed to have been infringed.</li>
          <li><strong>(c)</strong> Identification of the material that is claimed to be infringing, including sufficient information to permit us to locate the material on DesiredHub.</li>
          <li><strong>(d)</strong> Your full name, mailing address, telephone number, and email address.</li>
          <li><strong>(e)</strong> A statement that you have a good faith belief that the disputed use of the material is not authorized by the copyright owner, its agent, or the law.</li>
          <li><strong>(f)</strong> A statement, made under penalty of perjury, that the above information in your notice is accurate and that you are the copyright owner or authorized to act on the copyright owner's behalf.</li>
        </ul>
      </div>
    </div>
  );
}
