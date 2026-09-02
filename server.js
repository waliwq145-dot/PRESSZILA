require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "presszila-admin-2026";

/* =========================
   DATA STORAGE
========================= */

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "inquiries.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, "[]", "utf8");
}

/* =========================
   HELPERS
========================= */

function readInquiries() {
  try {
    const data = fs.readFileSync(dataFile, "utf8");

    if (!data.trim()) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Read inquiries error:", error);
    return [];
  }
}

function saveInquiries(inquiries) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(inquiries, null, 2),
    "utf8"
  );
}

function clean(value, maxLength = 2000) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

/* =========================
   APP CONFIG
========================= */

app.use(express.json({ limit: "100kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb"
  })
);

/* =========================
   STATIC WEBSITE
========================= */

app.use(express.static(__dirname));

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    website: "PRESSZILA",
    status: "running"
  });
});

/* =========================
   SUBMIT INQUIRY
========================= */

app.post("/api/inquiries", (req, res) => {
  try {
    const body = req.body || {};

    const type =
      body.type === "quote"
        ? "quote"
        : "contact";

    const name = clean(body.name, 120);
    const email = clean(body.email, 180);
    const phone = clean(body.phone, 60);
    const company = clean(body.company, 160);
    const service = clean(body.service, 120);
    const budget = clean(body.budget, 120);
    const timeline = clean(body.timeline, 120);

    const message = clean(
      body.message || body.projectDetails,
      5000
    );

    if (!name || !email || !message) {
      return res.status(400).json({
        ok: false,
        error:
          "Name, email and message/project details are required."
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: "Please enter a valid email address."
      });
    }

    const inquiries = readInquiries();

    const inquiry = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2),

      type,

      name,
      email,
      phone,
      company,
      service,
      budget,
      timeline,
      message,

      created_at: new Date().toISOString()
    };

    inquiries.unshift(inquiry);

    saveInquiries(inquiries);

    console.log(
      "New inquiry:",
      inquiry.name,
      inquiry.email
    );

    return res.status(201).json({
      ok: true,
      id: inquiry.id,
      message:
        "Thanks — your inquiry has been received."
    });

  } catch (error) {
    console.error(
      "Inquiry submission error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Something went wrong while submitting your inquiry."
    });
  }
});

/* =========================
   ADMIN INQUIRIES
========================= */

app.get(
  "/api/admin/inquiries",
  (req, res) => {

    const key =
      req.get("x-admin-key") ||
      req.query.key ||
      "";

    if (!key || key !== ADMIN_KEY) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    try {

      const inquiries = readInquiries();

      inquiries.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

      return res.json({
        ok: true,
        inquiries
      });

    } catch (error) {

      console.error(
        "Admin inquiry error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Unable to load inquiries."
      });
    }
  }
);

/* =========================
   ADMIN DELETE ALL
   OPTIONAL
========================= */

app.delete(
  "/api/admin/inquiries",
  (req, res) => {

    const key =
      req.get("x-admin-key") ||
      "";

    if (!key || key !== ADMIN_KEY) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    try {

      saveInquiries([]);

      return res.json({
        ok: true,
        message: "All inquiries deleted."
      });

    } catch (error) {

      console.error(
        "Delete inquiries error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Unable to delete inquiries."
      });
    }
  }
);

/* =========================
   WEBSITE ROUTES
========================= */

const pages = {
  "/": "home.html",
  "/home.html": "home.html",
  "/about.html": "about.html",
  "/solutions.html": "solutions.html",
  "/case-studies.html": "case-studies.html",
  "/testimonials.html": "testimonials.html",
  "/blogs.html": "blogs.html",
  "/contact.html": "contact.html",
  "/quote.html": "quote.html",
  "/admin.html": "admin.html"
};

Object.entries(pages).forEach(
  ([route, file]) => {

    app.get(route, (req, res) => {

      const filePath =
        path.join(__dirname, file);

      if (!fs.existsSync(filePath)) {

        return res.status(404).send(
          `Page not found: ${file}`
        );
      }

      res.sendFile(filePath);
    });
  }
);

/* =========================
   API 404
========================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      ok: false,
      error: "API endpoint not found."
    });
  }
);

/* =========================
   GENERAL 404
========================= */

app.use(
  (req, res) => {

    res.status(404).send(
      "PRESSZILA - Page not found"
    );
  }
);

/* =========================
   ERROR HANDLER
========================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      ok: false,
      error: "Internal server error."
    });
  }
);

/* =========================
   START
========================= */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log(
    "===================================="
  );

  console.log(
    "        PRESSZILA WEBSITE"
  );

  console.log(
    "===================================="
  );

  console.log(
    `PORT: ${PORT}`
  );

  console.log(
    `Admin: /admin.html`
  );

  console.log(
    `Health: /api/health`
  );

  console.log(
    "===================================="
  );

});
