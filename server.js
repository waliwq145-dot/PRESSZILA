require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = Number(process.env.PORT || 3000);

const ADMIN_KEY =
  process.env.ADMIN_KEY || "presszila-admin-2026";

/* =====================================================
   DATABASE
===================================================== */

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true
  });
}

const databaseFile = path.join(
  dataDir,
  "presszila.db"
);

const db = new Database(databaseFile);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    type TEXT NOT NULL,

    name TEXT NOT NULL,

    email TEXT NOT NULL,

    phone TEXT DEFAULT '',

    company TEXT DEFAULT '',

    service TEXT DEFAULT '',

    budget TEXT DEFAULT '',

    timeline TEXT DEFAULT '',

    message TEXT NOT NULL,

    created_at TEXT NOT NULL
      DEFAULT (datetime('now'))
  );
`);

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
  express.json({
    limit: "100kb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb"
  })
);

/*
  Serve all website files from project root
*/
app.use(
  express.static(__dirname)
);

/* =====================================================
   VALIDATION
===================================================== */

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const services = [
  "Digital PR",
  "Media Relations",
  "Brand Strategy",
  "Content & Storytelling",
  "Reputation Management",
  "Creator Relations",
  "Launch Campaign",
  "Social & Creative"
];

const budgets = [
  "Under PKR 100,000",
  "PKR 100,000 – 250,000",
  "PKR 250,000 – 500,000",
  "PKR 500,000+",
  "Not sure yet"
];

const timelines = [
  "ASAP",
  "Within 2 weeks",
  "Within 1 month",
  "1–3 months",
  "Flexible"
];

function clean(
  value,
  maxLength = 2000
) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (_req, res) => {

    res.json({
      ok: true,
      website: "PRESSZILA",
      status: "running"
    });

  }
);

/* =====================================================
   SUBMIT INQUIRY
===================================================== */

app.post(
  "/api/inquiries",
  (req, res) => {

    try {

      const body = req.body || {};

      /*
        Accept both:
        type = contact
        type = quote

        Anything other than quote
        becomes contact.
      */

      const type =
        String(body.type || "")
          .toLowerCase() === "quote"
          ? "quote"
          : "contact";


      const name =
        clean(
          body.name,
          120
        );


      const email =
        clean(
          body.email,
          180
        );


      const phone =
        clean(
          body.phone,
          60
        );


      const company =
        clean(
          body.company,
          160
        );


      const service =
        clean(
          body.service,
          120
        );


      const budget =
        clean(
          body.budget,
          120
        );


      const timeline =
        clean(
          body.timeline,
          120
        );


      const message =
        clean(
          body.message ||
          body.projectDetails ||
          body.details,
          5000
        );


      /* =========================
         REQUIRED FIELDS
      ========================= */

      if (
        !name ||
        !email ||
        !message
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Name, email and message/project details are required."

        });

      }


      /* =========================
         EMAIL
      ========================= */

      if (
        !emailRegex.test(email)
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Please enter a valid email address."

        });

      }


      /* =========================
         QUOTE VALIDATION
      ========================= */

      if (type === "quote") {

        if (
          service &&
          !services.includes(service)
        ) {

          return res.status(400).json({

            ok: false,

            error:
              "Please select a valid service."

          });

        }


        if (
          budget &&
          !budgets.includes(budget)
        ) {

          return res.status(400).json({

            ok: false,

            error:
              "Please select a valid budget."

          });

        }


        if (
          timeline &&
          !timelines.includes(timeline)
        ) {

          return res.status(400).json({

            ok: false,

            error:
              "Please select a valid timeline."

          });

        }

      }


      /* =========================
         INSERT
      ========================= */

      const insert =
        db.prepare(`

          INSERT INTO inquiries (

            type,
            name,
            email,
            phone,
            company,
            service,
            budget,
            timeline,
            message

          )

          VALUES (

            @type,
            @name,
            @email,
            @phone,
            @company,
            @service,
            @budget,
            @timeline,
            @message

          )

        `);


      const result =
        insert.run({

          type,
          name,
          email,
          phone,
          company,
          service,
          budget,
          timeline,
          message

        });


      console.log(
        "New inquiry saved:",
        {
          id:
            result.lastInsertRowid,
          type,
          name,
          email
        }
      );


      return res.status(201).json({

        ok: true,

        id:
          result.lastInsertRowid,

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

  }
);

/* =====================================================
   ADMIN AUTH CHECK
===================================================== */

function checkAdminKey(req) {

  const key =
    req.get("x-admin-key") ||
    req.query.key ||
    "";

  return key === ADMIN_KEY;
}

/* =====================================================
   ADMIN INQUIRIES
===================================================== */

app.get(
  "/api/admin/inquiries",
  (req, res) => {

    if (!checkAdminKey(req)) {

      return res.status(401).json({

        ok: false,

        error:
          "Unauthorized"

      });

    }


    try {

      const inquiries =
        db.prepare(`

          SELECT

            id,
            type,
            name,
            email,
            phone,
            company,
            service,
            budget,
            timeline,
            message,
            created_at

          FROM inquiries

          ORDER BY

            datetime(created_at) DESC,

            id DESC

        `).all();


      return res.json({

        ok: true,

        count:
          inquiries.length,

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

/* =====================================================
   ADMIN STATS
===================================================== */

app.get(
  "/api/admin/stats",
  (req, res) => {

    if (!checkAdminKey(req)) {

      return res.status(401).json({

        ok: false,

        error:
          "Unauthorized"

      });

    }


    try {

      const total =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM inquiries
        `).get().count;


      const quotes =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM inquiries
          WHERE type = 'quote'
        `).get().count;


      const contacts =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM inquiries
          WHERE type = 'contact'
        `).get().count;


      const latest =
        db.prepare(`
          SELECT created_at
          FROM inquiries
          ORDER BY
            datetime(created_at) DESC,
            id DESC
          LIMIT 1
        `).get();


      return res.json({

        ok: true,

        stats: {

          total,

          quotes,

          contacts,

          latest:
            latest
              ? latest.created_at
              : null

        }

      });

    } catch (error) {

      console.error(
        "Admin stats error:",
        error
      );

      return res.status(500).json({

        ok: false,

        error:
          "Unable to load admin statistics."

      });

    }

  }
);

/* =====================================================
   WEBSITE PAGES
===================================================== */

const pages = {

  "/":
    "home.html",

  "/home.html":
    "home.html",

  "/about.html":
    "about.html",

  "/solutions.html":
    "solutions.html",

  "/case-studies.html":
    "case-studies.html",

  "/testimonials.html":
    "testimonials.html",

  "/blogs.html":
    "blogs.html",

  "/contact.html":
    "contact.html",

  "/quote.html":
    "quote.html",

  "/admin.html":
    "admin.html"

};


for (
  const [route, file]
  of Object.entries(pages)
) {

  app.get(
    route,
    (_req, res) => {

      const filePath =
        path.join(
          __dirname,
          file
        );

      res.sendFile(
        filePath,
        (error) => {

          if (error) {

            console.error(
              `Unable to serve ${file}:`,
              error
            );

            if (
              !res.headersSent
            ) {

              res.status(404).send(
                "Page not found."
              );

            }

          }

        }
      );

    }
  );

}


/* =====================================================
   API 404
===================================================== */

app.use(
  "/api",
  (_req, res) => {

    res.status(404).json({

      ok: false,

      error:
        "API endpoint not found."

    });

  }
);


/* =====================================================
   GENERAL 404
===================================================== */

app.use(
  (_req, res) => {

    res.status(404).send(
      "Page not found."
    );

  }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {

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
      `Website: http://localhost:${PORT}`
    );

    console.log(
      `Admin:   http://localhost:${PORT}/admin.html`
    );

    console.log(
      `Health:  http://localhost:${PORT}/api/health`
    );

    console.log(
      `Database: ${databaseFile}`
    );

    console.log(
      "===================================="
    );

    console.log("");

