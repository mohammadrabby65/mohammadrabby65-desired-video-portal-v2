import { SEO } from "../components/seo/SEO";

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16 min-h-screen">
      <SEO
        title="Privacy Policy - DESIRED"
        description="Privacy Policy of DESIRED."
        exactTitle={true}
      />
      <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-neutral-300">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>
        <p>
          This document details important information regarding the use and disclosure of User Data collected on our site.
        </p>
        <p>
          This site expressly and strictly limits its membership and/or viewing privileges to adults 18+years of age. All persons who do not meet its criteria are strictly forbidden from accessing or viewing the contents of this site. We do not knowingly seek or collect any personal information or data from persons who have not attained the age of majority.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">DATA COLLECTED</h2>
        <p>
          Users can watch videos without registering and without any information being collected and processed.
        </p>
        <p>
          Registration is required for uploading videos, and accessing other features.
        </p>
        <p>
          Information collected is: username, email address, year of birth.
        </p>
        <p>
          Cookies: When you visit our site, we may send one or more cookies to your computer that uniquely identifies your browser session. We use both session cookies and persistent cookies. If you remove your persistent cookie, some of the site’s features may not function properly.
        </p>
        <p>
          Log File Information: When you visit our site, our servers automatically record certain information that your web browser sends such as your IP address, browser type, browser language, referring URL, platform type, domain name and the date and time of your request.
        </p>
        <p>
          Email address: If you contact us, we may keep a record of that correspondence.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">USES</h2>
        <p>
          Any videos that you submit to us may be redistributed through the internet and other media channels, and may be viewed by the general public.
        </p>
        <p>
          We do not use your email address or other personally identifiable information to send commercial or marketing messages without your consent.
        </p>
        <p>
          We may use your email address for non-marketing administrative purposes.
        </p>
        <p>
          We analyze aggregated user traffic information to help streamline our hosting operations and to improve the quality of the user-experience.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">DISCLOSURE OF INFORMATION</h2>
        <p>
          We do not share your personal information (such as name or email address) with other, third-party companies.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">SECURITY</h2>
        <p>
          You are responsible for keeping your password confidential. We ask you not to share your password with anyone.
        </p>
      </div>
    </div>
  );
}
