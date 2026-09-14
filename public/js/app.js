(function () {
  "use strict";

  var shortenForm = document.getElementById("shorten-form");
  var urlInput = document.getElementById("url");
  var passwordInput = document.getElementById("password");
  var shortenBtn = document.getElementById("shorten-btn");
  var resetBtn = document.getElementById("reset-btn");
  var resultEl = document.getElementById("result");
  var errorEl = document.getElementById("error");
  var shortLink = document.getElementById("short-link");
  var shortId = document.getElementById("short-id");
  var openBtn = document.getElementById("open-btn");
  var copyBtn = document.getElementById("copy-btn");
  var copyIdBtn = document.getElementById("copy-id-btn");
  var copyToast = document.getElementById("copy-toast");
  var btnLabel = shortenBtn.querySelector(".btn-label");
  var btnSpinner = shortenBtn.querySelector(".btn-spinner");

  var lookupForm = document.getElementById("lookup-form");
  var lookupId = document.getElementById("lookup-id");
  var lookupPassword = document.getElementById("lookup-password");
  var viewBtn = document.getElementById("view-btn");
  var openLookupBtn = document.getElementById("open-lookup-btn");
  var lookupResult = document.getElementById("lookup-result");
  var lookupUrl = document.getElementById("lookup-url");
  var lookupError = document.getElementById("lookup-error");

  var toastTimer = null;

  function baseUrl() {
    return window.location.origin;
  }

  function openUrlFor(id, password) {
    var url = baseUrl() + "/api/open/" + encodeURIComponent(id);
    if (password) {
      url += "?password=" + encodeURIComponent(password);
    }
    return url;
  }

  function viewUrlFor(id, password) {
    var url = baseUrl() + "/api/view/" + encodeURIComponent(id);
    if (password) {
      url += "?password=" + encodeURIComponent(password);
    }
    return url;
  }

  function setLoading(loading) {
    shortenBtn.disabled = loading;
    btnSpinner.hidden = !loading;
    btnLabel.textContent = loading ? "Creating…" : "Create shoutlink";
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    resultEl.hidden = true;
  }

  function hideError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function showLookupError(message) {
    lookupError.textContent = message;
    lookupError.hidden = false;
    lookupResult.hidden = true;
  }

  function hideLookupError() {
    lookupError.hidden = true;
    lookupError.textContent = "";
  }

  function normalizeUrl(raw) {
    var value = (raw || "").trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }
    return value;
  }

  function isValidUrl(value) {
    try {
      var u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function showResult(id, password) {
    var openHref = openUrlFor(id, password);
    shortId.textContent = id;
    shortLink.textContent = openHref;
    shortLink.href = openHref;
    openBtn.href = openHref;
    resultEl.hidden = false;
    hideError();
    copyToast.hidden = true;
  }

  function resetShortenForm() {
    shortenForm.reset();
    resultEl.hidden = true;
    hideError();
    copyToast.hidden = true;
    urlInput.focus();
  }

  function showToast() {
    copyToast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      copyToast.hidden = true;
    }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(showToast).catch(function () {
        fallbackCopy(text);
      });
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast();
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  shortenForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError();

    var url = normalizeUrl(urlInput.value);
    var password = (passwordInput.value || "").trim();

    if (!url || !isValidUrl(url)) {
      showError("Please enter a valid URL (http or https).");
      urlInput.focus();
      return;
    }

    urlInput.value = url;
    setLoading(true);

    var body = new URLSearchParams();
    body.set("url", url);
    if (password) body.set("password", password);

    fetch("/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/plain"
      },
      body: body.toString()
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { ok: res.ok, status: res.status, text: (text || "").trim() };
        });
      })
      .then(function (payload) {
        if (payload.status === 201 && payload.text) {
          showResult(payload.text, password || null);
          return;
        }
        if (payload.status === 422) {
          showError("Could not save that URL. Check the format and try again.");
          return;
        }
        showError(payload.text || "Something went wrong (" + payload.status + ").");
      })
      .catch(function () {
        showError("Network error — is the shoutlink server running?");
      })
      .finally(function () {
        setLoading(false);
      });
  });

  resetBtn.addEventListener("click", resetShortenForm);

  copyBtn.addEventListener("click", function () {
    if (shortLink.href && shortLink.href !== "#") {
      copyText(shortLink.href);
    }
  });

  copyIdBtn.addEventListener("click", function () {
    if (shortId.textContent) {
      copyText(shortId.textContent);
    }
  });

  lookupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideLookupError();

    var id = (lookupId.value || "").trim();
    var password = (lookupPassword.value || "").trim();

    if (!id) {
      showLookupError("Enter a shoutlink ID.");
      lookupId.focus();
      return;
    }

    viewBtn.disabled = true;

    fetch(viewUrlFor(id, password || null), {
      method: "GET",
      headers: { Accept: "text/plain" }
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { ok: res.ok, status: res.status, text: (text || "").trim() };
        });
      })
      .then(function (payload) {
        if (payload.ok && payload.text) {
          lookupUrl.textContent = payload.text;
          lookupUrl.href = payload.text;
          lookupResult.hidden = false;
          hideLookupError();
          return;
        }
        if (payload.status === 404) {
          showLookupError("No link found for that ID.");
          return;
        }
        if (payload.status === 401) {
          showLookupError("Wrong or missing password for this link.");
          return;
        }
        showLookupError(payload.text || "Lookup failed (" + payload.status + ").");
      })
      .catch(function () {
        showLookupError("Network error — is the shoutlink server running?");
      })
      .finally(function () {
        viewBtn.disabled = false;
      });
  });

  openLookupBtn.addEventListener("click", function () {
    hideLookupError();
    var id = (lookupId.value || "").trim();
    var password = (lookupPassword.value || "").trim();
    if (!id) {
      showLookupError("Enter a shoutlink ID.");
      lookupId.focus();
      return;
    }
    window.open(openUrlFor(id, password || null), "_blank", "noopener,noreferrer");
  });
})();
