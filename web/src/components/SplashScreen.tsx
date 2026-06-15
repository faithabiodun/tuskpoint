import { LogoMark } from "./Logo";

/**
 * Intro splash, server-rendered so it is present in the initial HTML and
 * painted BEFORE the landing page. It is visible by default and fades itself
 * out with pure CSS (see #tp-splash in globals.css), so it never waits on React
 * hydration. A tiny inline script, placed just ahead of the markup, runs during
 * HTML parsing: if the splash has already shown this session it adds
 * `tp-splash-seen` to <html> so the CSS hides it with no flash; otherwise it
 * records that the splash is running now.
 */
export function SplashScreen() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{if(sessionStorage.getItem('tp-splash-seen')){document.documentElement.classList.add('tp-splash-seen');}else{sessionStorage.setItem('tp-splash-seen','1');}}catch(e){}})();",
        }}
      />
      <div id="tp-splash" aria-hidden>
        <div>
          <LogoMark className="h-20 w-20" idPrefix="splash" />
          <span className="tp-splash-word">
            Tusk<span>Point</span>
          </span>
        </div>
      </div>
    </>
  );
}
