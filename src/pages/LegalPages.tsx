import { Link } from 'react-router-dom';
import './LegalPage.css';

const LAST_UPDATED = 'September 7, 2026';

export function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Home
        </Link>

        <div className="legal-header">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="legal-content">
          <p>This Privacy Policy describes how REX.io ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") handles information when you use our website. We are committed to being transparent about what data is and is not collected.</p>

          <h2>1. Information We Collect</h2>

          <h3>1.1 Account Information</h3>
          <p>If you choose to sign in, we use <strong>Supabase Authentication</strong> with Google OAuth. This provides us with your Google display name, email address, and profile photo. We do not access your Google password or any other Google account data.</p>

          <h3>1.2 Watchlist &amp; Watch History</h3>
          <p>When signed in, your watchlist selections and watch history (which movies/shows you visited) are stored in our <strong>Supabase database</strong> and associated with your account. If you use REX.io as a guest (without signing in), watch history is stored temporarily in your browser's <strong>sessionStorage</strong> and is cleared when you close the tab. Guest watchlist data is cached in <strong>localStorage</strong>.</p>

          <h3>1.3 Search Queries</h3>
          <p>Search queries you type are sent to our server-side API, which proxies requests to the <strong>TMDB (The Movie Database)</strong> API. We do not permanently log or store individual search queries.</p>

          <h3>1.4 Device &amp; Browser Information</h3>
          <p>Our hosting infrastructure (Vercel) may automatically collect standard technical information such as your IP address, browser type, operating system, and referral URLs as part of normal web server operation. We do not add additional client-side tracking or analytics scripts.</p>

          <h3>1.5 Cookies &amp; Local Storage</h3>
          <p>REX.io uses browser storage as described in our <Link to="/cookies">Cookie Policy</Link>. We do not use third-party advertising or marketing cookies.</p>

          <h2>2. How We Use Information</h2>
          <ul>
            <li><strong>Account data</strong> — to authenticate you and personalize your experience (display name, avatar).</li>
            <li><strong>Watchlist &amp; history</strong> — to let you save and revisit movies/shows.</li>
            <li><strong>Search queries</strong> — to return relevant movie and TV results from TMDB.</li>
            <li><strong>Technical/server logs</strong> — for security, debugging, and infrastructure operation.</li>
          </ul>

          <h2>3. Third-Party Services</h2>
          <ul>
            <li><strong>Supabase</strong> — authentication, database storage for watchlist and history. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a>.</li>
            <li><strong>Google OAuth</strong> — sign-in authentication. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
            <li><strong>TMDB</strong> — movie/TV metadata and images. <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer">TMDB Privacy Policy</a>.</li>
            <li><strong>External Streaming Providers</strong> — video content is embedded from third-party providers via iframe. These providers may set their own cookies and collect data independently. See our <Link to="/terms">Terms &amp; Conditions</Link> for more details.</li>
            <li><strong>Vercel</strong> — hosting infrastructure. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a>.</li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>Account-linked watchlist and history data is retained as long as your account exists. Guest session data is automatically cleared when the browser session ends. Server-side logs are managed by our hosting provider according to their retention policies.</p>

          <h2>5. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting us at <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>. You can delete your watch history and watchlist directly through the application at any time. You can sign out and revoke Google access through your Google Account settings.</p>

          <h2>6. Children's Privacy</h2>
          <p>REX.io is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>

          <h2>7. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.</p>

          <h2>8. Contact</h2>
          <p>For privacy-related questions, contact us at <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  );
}

export function CookiePolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Home
        </Link>

        <div className="legal-header">
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-updated">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="legal-content">
          <p>This Cookie Policy explains how REX.io uses cookies and similar browser storage technologies.</p>

          <h2>1. What Are Cookies &amp; Browser Storage?</h2>
          <p>Cookies are small text files placed on your device by a website. <strong>localStorage</strong> and <strong>sessionStorage</strong> are browser-based storage mechanisms that allow websites to store data locally on your device. localStorage persists until explicitly cleared; sessionStorage is cleared when the browser tab is closed.</p>

          <h2>2. How REX.io Uses Browser Storage</h2>

          <h3>2.1 Strictly Necessary (Authentication)</h3>
          <p>When you sign in with Google, <strong>Supabase</strong> sets authentication cookies and localStorage tokens to manage your session. These are essential for the sign-in functionality to work and cannot be disabled without breaking authentication.</p>
          <ul>
            <li><strong>Supabase auth tokens</strong> — stored in localStorage by the Supabase client library to maintain your authenticated session across page reloads.</li>
          </ul>

          <h3>2.2 Functionality (Watchlist &amp; Preferences)</h3>
          <ul>
            <li><strong>Guest watchlist cache</strong> — stored in localStorage to allow unauthenticated users to maintain a temporary watchlist.</li>
            <li><strong>Application preferences</strong> — any user preferences or UI state may be stored in localStorage via the application's persistent state hook.</li>
          </ul>

          <h3>2.3 Functionality (Watch History)</h3>
          <ul>
            <li><strong>Guest watch history</strong> — stored in sessionStorage for unauthenticated users. This data is automatically cleared when you close the browser tab.</li>
          </ul>

          <h3>2.4 Third-Party Cookies</h3>
          <p>The embedded video player loads content from external streaming providers via iframe. These providers may set their own cookies for functionality, advertising, or tracking purposes. REX.io does not control these third-party cookies. Refer to the respective provider's privacy and cookie policies for details.</p>

          <h2>3. Cookies We Do NOT Use</h2>
          <p>REX.io does <strong>not</strong> use:</p>
          <ul>
            <li>Google Analytics or any analytics tracking scripts</li>
            <li>Advertising or marketing cookies</li>
            <li>Social media tracking pixels</li>
            <li>Fingerprinting or cross-site tracking technologies</li>
          </ul>

          <h2>4. Managing Cookies &amp; Storage</h2>
          <p>You can clear cookies and browser storage at any time through your browser settings. Note that clearing Supabase authentication data will sign you out, and clearing localStorage will remove any cached watchlist data.</p>

          <h2>5. Changes</h2>
          <p>We may update this Cookie Policy if our storage practices change. Updates will be reflected with a new "Last Updated" date on this page.</p>
        </div>
      </div>
    </div>
  );
}

export function TermsConditionsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Home
        </Link>

        <div className="legal-header">
          <h1 className="legal-title">Terms &amp; Conditions</h1>
          <p className="legal-updated">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="legal-content">
          <p>By accessing and using REX.io, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use the website.</p>

          <h2>1. Description of Service</h2>
          <p>REX.io is a web application that allows users to discover, search for, and organize movies and TV shows. The platform provides metadata sourced from <strong>TMDB (The Movie Database)</strong>, user features such as watchlists and watch history powered by <strong>Supabase</strong>, and an embedded video player that loads content from external third-party streaming providers.</p>

          <div className="legal-disclaimer">
            <p><strong>External Streaming Disclaimer:</strong> REX.io does not host, upload, store, or distribute any video/movie/TV content on its own servers. The video player embeds content from independent third-party streaming providers via iframe technology. Playback availability, quality, advertisements, subtitles, buffering, geographic restrictions, and any other provider-specific behavior are entirely controlled by those external services. REX.io has no control over and makes no guarantees regarding the content delivered by these providers.</p>
          </div>

          <p>While video content is delivered by external providers, REX.io may still process website-related information such as search queries, user preferences, account details, watchlists, watch history, and standard technical/server logs as described in our <Link to="/privacy">Privacy Policy</Link>.</p>

          <h2>2. Acceptable Use</h2>
          <p>You agree to use REX.io only for lawful purposes and in a manner consistent with these Terms. You may:</p>
          <ul>
            <li>Browse, search for, and discover movie/TV metadata.</li>
            <li>Create an account to save watchlists and history.</li>
            <li>Use the embedded player to access content provided by third-party services.</li>
          </ul>

          <h2>3. Prohibited Use</h2>
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Attempt to circumvent, disable, or interfere with the website's security features.</li>
            <li>Use automated tools (bots, scrapers) to access the service in a manner that degrades performance for other users.</li>
            <li>Reverse-engineer, decompile, or attempt to extract source code beyond what is permitted by applicable law.</li>
            <li>Use the service for any illegal activity or in violation of any applicable law or regulation.</li>
            <li>Impersonate another person or misrepresent your affiliation with any entity.</li>
            <li>Transmit any malicious code, viruses, or harmful data through the service.</li>
          </ul>

          <h2>4. User Responsibility</h2>
          <p>You are solely responsible for your use of REX.io and for any content you access through the service. If you create an account, you are responsible for maintaining the confidentiality of your authentication credentials.</p>

          <h2>5. Third-Party Services</h2>
          <p>REX.io integrates with the following third-party services:</p>
          <ul>
            <li><strong>TMDB</strong> — provides movie/TV metadata and images. TMDB's terms and conditions apply to their data.</li>
            <li><strong>Supabase</strong> — provides authentication and database services.</li>
            <li><strong>Google</strong> — provides OAuth authentication.</li>
            <li><strong>External streaming providers</strong> — deliver video content via embedded iframes. Each provider operates under their own terms of service.</li>
          </ul>
          <p>REX.io is not responsible for the content, privacy practices, or availability of these third-party services.</p>

          <h2>6. Intellectual Property</h2>
          <p>Movie and TV metadata, poster images, and backdrop images displayed on REX.io are provided by TMDB and remain the property of their respective copyright holders. The REX.io user interface, design, and original code are the property of REX.io and its operators.</p>
          <p>If you believe any content displayed on REX.io infringes your copyright, please contact us at <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>.</p>

          <h2>7. Availability &amp; Interruptions</h2>
          <p>REX.io is provided on an "as-is" and "as-available" basis. We do not guarantee that the service will be uninterrupted, error-free, or available at all times. We may modify, suspend, or discontinue any feature or the entire service at any time without prior notice.</p>

          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law, REX.io and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service, including but not limited to damages related to third-party content, service interruptions, or data loss.</p>

          <h2>9. Modifications to Terms</h2>
          <p>We reserve the right to modify these Terms &amp; Conditions at any time. Continued use of REX.io after changes are posted constitutes acceptance of the modified terms.</p>

          <h2>10. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of <strong>India</strong>, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of <strong>Maharashtra</strong>.</p>

          <h2>11. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  );
}

export function TermsOfUsePage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Home
        </Link>

        <div className="legal-header">
          <h1 className="legal-title">Terms of Use</h1>
          <p className="legal-updated">Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="legal-content">
          <p>These Terms of Use supplement the <Link to="/terms">Terms &amp; Conditions</Link> and provide additional information about using REX.io.</p>

          <h2>1. Eligibility</h2>
          <p>You must be at least 13 years of age to use REX.io. If you are under 18, you should use this service only with the involvement of a parent or guardian.</p>

          <h2>2. Account Usage</h2>
          <p>Creating an account is optional. You can browse and search REX.io without signing in. Signing in via Google enables persistent watchlists and watch history across sessions and devices. You may sign out or request account deletion at any time.</p>

          <h2>3. Content Accessed Through REX.io</h2>

          <div className="legal-disclaimer">
            <p><strong>Important:</strong> REX.io functions as a discovery and organization platform. Video content is not hosted on REX.io servers. The embedded player loads streams from external third-party providers. REX.io does not control, verify, endorse, or take responsibility for the content delivered by these providers, including its legality, accuracy, quality, availability, or advertisements.</p>
          </div>

          <p>Users are responsible for ensuring that their access to and use of any content through the service complies with applicable laws in their jurisdiction.</p>

          <h2>4. No Guarantee of Availability</h2>
          <p>REX.io does not guarantee that any specific movie or TV show will be available through the embedded player. Content availability depends entirely on the external streaming providers and may change or become unavailable without notice.</p>

          <h2>5. Fair Use &amp; Rate Limits</h2>
          <p>To ensure a good experience for all users, excessive automated requests or abusive usage patterns may result in temporary or permanent restrictions. Normal browsing, searching, and playback are always permitted.</p>

          <h2>6. Feedback &amp; Reporting</h2>
          <p>If you encounter broken content, technical issues, or material that you believe should not be accessible, please contact us at <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>.</p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>REX.io is provided "<strong>as is</strong>" without warranties of any kind, whether express or implied. We disclaim all warranties including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

          <h2>8. Indemnification</h2>
          <p>You agree to indemnify and hold harmless REX.io and its operators from any claims, damages, or expenses arising from your use of the service or violation of these Terms of Use.</p>

          <h2>9. Severability</h2>
          <p>If any provision of these Terms of Use is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>

          <h2>10. Contact</h2>
          <p>Questions about these Terms of Use should be directed to <a href="mailto:shuban1227@gmail.com">shuban1227@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  );
}
