(async () => {
  const qs = new URLSearchParams(location.search);
  let mode = qs.get("mode") === "cv" ? "cv" : "full";

  // Hard-coded taglines
  const TAGLINES = {
    ats: "ATS-friendly snapshot. Use the switch for the full CV.",
    cv: "Full CV with detailed project descriptions."
  };

  // Fetch JSON for a mode
  async function loadData(forMode) {
    const res = await fetch(`./content/${forMode}.json?v=${Date.now()}`, { cache: "no-cache" });
    if (!res.ok) throw new Error("content fetch failed");
    return res.json();
  }

  // Helpers
  const setText = (id, text = "") => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!text) el.style.display = "none";
    else { el.style.display = ""; el.textContent = text; }
  };
  const fillList = (id, arr = []) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (arr || []).map(x => `<li>${x}</li>`).join("");
  };
  function setToggleLinks(currentMode) {
    const next = currentMode === "ats" ? "cv" : "ats";
    const label = currentMode === "ats" ? "Switch to Full CV view" : "Switch to ATS view";
    const apply = (el) => { if (el) { el.textContent = label; el.href = `?mode=${next}`; } };
    apply(document.getElementById("toggleDoc"));
    apply(document.getElementById("toggleDocFooter"));
  }

  // Render the whole page from JSON
  function render(currentMode, data) {
    setToggleLinks(currentMode);
    setText("tagline", TAGLINES[currentMode] ?? "");
    setText("summary", data.summary || "");
    setText("personalDescription", data.personalDescription || "");
    setText("languagesNote", data.languagesNote || "");

    const sk = data.skills || {};
    fillList("skills-languages", sk.languages);
    fillList("skills-aws", sk.aws);
    fillList("skills-tools", sk.tools);
    fillList("skills-soft", sk.soft);
    fillList("skills-goals", data.goals || []);

    const projWrap = document.getElementById("projects");
    if (projWrap) {
      projWrap.innerHTML = (data.projects || []).map(p => `
        <article class="card">
          <h3>${p.name}</h3>
          <p>${p.blurb || ""}</p>
          ${p.stack ? `<p><strong>Stack:</strong> ${p.stack.join(" · ")}</p>` : ""}
          ${p.impact ? `<p><em>${p.impact}</em></p>` : ""}
          ${p.link ? `<a href="${p.link}" target="_blank" rel="noopener">GitHub</a>` : ""}
        </article>
      `).join("");
    }

    const workWrap = document.getElementById("work");
    if (workWrap) {
      workWrap.innerHTML = (data.work || []).map(w => `
        <section class="job">
          <h4>${w.company} — ${w.role}</h4>
          <div class="muted">${w.period || ""}</div>
          <ul>${(w.bullets || []).map(b => `<li>${b}</li>`).join("")}</ul>
        </section>
      `).join("");
    }

    const contact = document.getElementById("contact");
    if (contact) {
      const email = data?.contact?.email ? `Email: <a href="mailto:${data.contact.email}">${data.contact.email}</a>` : "";
      const phone = (currentMode === "ats" && data?.contact?.phone) ? ` | Phone: ${data.contact.phone}` : "";
      contact.innerHTML = `${email}${phone}`;
    }
  }

  // Initial load
  try {
    const data = await loadData(mode);
    render(mode, data);
    const built = document.getElementById("footerBuilt");
    if (built) built.textContent = `© ${new Date().getFullYear()} Darren Fawcett — Hosted on AWS S3 + CloudFront.`;
  } catch {
    const el = document.getElementById("summary");
    if (el) el.textContent = "Unable to load content.";
  }

  // Smooth switch handler
  async function handleSwitch(e) {
    e.preventDefault();
    const next = mode === "ats" ? "cv" : "ats";
    const root = document.getElementById("cvContent");

    if (root) { root.classList.add("is-fading"); root.setAttribute("aria-busy", "true"); }

    try {
      const data = await loadData(next);
      history.pushState({ mode: next }, "", `?mode=${next}`); // update URL without reload
      mode = next;
      render(mode, data);
    } catch {
      // Fallback: full navigation if fetch fails (keeps it robust)
      location.href = `?mode=${next}`;
      return;
    } finally {
      if (root) {
        requestAnimationFrame(() => {
          root.classList.remove("is-fading");
          root.removeAttribute("aria-busy");
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    }
  }

  // Hook up both toggles
  const headerSwitch = document.getElementById("toggleDoc");
  const footerSwitch = document.getElementById("toggleDocFooter");
  if (headerSwitch) headerSwitch.addEventListener("click", handleSwitch);
  if (footerSwitch) footerSwitch.addEventListener("click", handleSwitch);

  // Handle back/forward buttons
  window.addEventListener("popstate", async () => {
    const m = new URLSearchParams(location.search).get("mode") === "cv" ? "cv" : "ats";
    if (m === mode) return;
    const root = document.getElementById("cvContent");
    if (root) root.classList.add("is-fading");
    try {
      const data = await loadData(m);
      mode = m;
      render(mode, data);
    } finally {
      if (root) root.classList.remove("is-fading");
    }
  });

  const dl = document.getElementById("downloadPdf");
  if (dl) dl.addEventListener("click", (e) => {
    e.preventDefault();
    window.print();
  });

})();
