// ===============================
// GLOBAL VARIABLES
// ===============================
let courseCategoryMap = {};
let allCoursesGlobal = [];

// ===============================
// FINAL GRADUATION REQUIREMENTS
// ===============================
const graduationRequirements = {
    PEC: 5,
    SDC: 5,
    AUC: 6,
    HAS: 7,
    BSC: 8,
    ESC: 8,
    PCC: 8,
    FCC: 1,
    OEC: 3,
    SIL: 3,
    VAC: 3,
    PRI: 10

};
const TOTAL_REQUIRED_CREDITS = 171;

// ===============================
// EXIT CREDIT REQUIREMENTS
// ===============================
const exitCreditRequirements = [
    { code: "HAS", name: "Humanities, Arts and Social Sciences", required: 17 },
    { code: "BSC", name: "Basic Science Courses",                required: 32 },
    { code: "ESC", name: "Engineering Science Courses",          required: 30 },
    { code: "FCC", name: "Flexi Core Courses",                   required: 3  },
    { code: "PCC", name: "Professional Core Courses",            required: 31 },
    { code: "PEC", name: "Professional Elective Courses",        required: 19 },
    { code: "SDC", name: "Skill Development Courses",            required: 8  },
    { code: "PRI", name: "Project Research and Internship",      required: 16 },
    { code: "OEC", name: "Open Elective Courses",                required: 12 },
    { code: "SIL", name: "Social Immersive Learning",            required: 3  }
];

// ===============================
// LOAD MASTER COURSE FILE (WITH CREDITS)
// ===============================
async function loadMasterCourses() {
    try {
        const res = await fetch("mightymerge.io__qhf8v4yp.csv");
        const text = await res.text();
        const rows = text.replace(/\r/g, "").split("\n");

        let headerRowIndex = rows.findIndex(row =>
            row.toLowerCase().includes("category") &&
            row.toLowerCase().includes("course code")
        );

        if (headerRowIndex === -1) {
            console.error("Header row not found!");
            return;
        }

        const headers = rows[headerRowIndex]
            .split(",")
            .map(h => h.replace(/"/g, "").trim().toLowerCase());

        const categoryIndex = headers.findIndex(h => h.includes("category"));
        const codeIndex = headers.findIndex(h => h.includes("course code"));
        const creditIndex = headers.findIndex(h => h.includes("credit"));

        courseCategoryMap = {};

        for (let i = headerRowIndex + 1; i < rows.length; i++) {

            const cols = rows[i].split(",");
            if (cols.length <= Math.max(categoryIndex, codeIndex)) continue;

            const courseCode = cols[codeIndex]
                ?.replace(/"/g, "")
                .replace(/\s+/g, "")
                .toUpperCase()
                .trim();

            const category = cols[categoryIndex]
                ?.replace(/"/g, "")
                .trim()
                .toUpperCase();

            const credits = parseFloat(cols[creditIndex]) || 0;

            if (courseCode) {
                courseCategoryMap[courseCode] = {
                    category: category,
                    credits: credits
                };
            }
        }

    } catch (error) {
        console.error("Error loading master file:", error);
    }
}


// ===============================
// GET STUDENT DATA
// ===============================
// ===============================
// GET STUDENT DATA
// ===============================
async function getStudent() {

    if (Object.keys(courseCategoryMap).length === 0) {
        await loadMasterCourses();
    }

    const studentId = document.getElementById("studentId").value.trim();
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    allCoursesGlobal = [];

    if (studentId === "") {
        alert("Please enter University ID");
        return;
    }

    const files = [
        { name: "1-1 Semester", file: "ai_ds_1_1.csv", type: "student" },
        { name: "1-2 Semester", file: "ai_ds_1_2.csv", type: "student" },
        { name: "Summer Term - 1", file: "ai_ds_summer.csv", type: "student" },
        { name: "2-1 Semester", file: "ai_ds_2_1.csv", type: "student" },
        { name: "2-2 Semester", file: "ai_ds_2_2.csv", type: "student" },
        { name: "Summer Term - 2", file: "ai_ds_summer_2.csv", type: "student" },
        { name: "3-1 Semester", file: "ai_ds_3_1.csv", type: "student" },
        { name: "3-2 Semester", file: "ai_ds_3_2.csv", type: "student" },
        { name: "4th Year (Odd/Even)", file: "even and odd sem .csv", type: "plan" }
    ];

    let foundAny = false;

    for (const term of files) {
        try {
            const res = await fetch(term.file);
            if (!res.ok) continue;

            const text = await res.text();
            const rows = text.replace(/\r/g, "").trim().split("\n");

            let courses = [];

            for (let i = 1; i < rows.length; i++) {

                const cols = rows[i].split(",");

                if (term.type === "student") {
                    if (cols[1]?.trim() !== studentId) continue;

                    const courseCode = cols[3]
                        ?.replace(/"/g, "")
                        .replace(/\s+/g, "")
                        .toUpperCase()
                        .trim();

                    const courseInfo = courseCategoryMap[courseCode] || {};

                    courses.push({
                        name: cols[2]?.replace(/"/g, "").trim() || "Planned Course",
                        courseCode: courseCode,
                        courseDesc: cols[5]?.replace(/"/g, "").trim(),
                        category: normalizeCategory(courseInfo.category || cols[6]),
                        credits: courseInfo.credits || 0,
                        academicYear: cols[8]?.replace(/"/g, "").trim() || "4th Year"
                    });
                }

                if (term.type === "plan") {
                    const courseCode = cols[5]
                        ?.replace(/"/g, "")
                        .replace(/\s+/g, "")
                        .toUpperCase()
                        .trim();

                    if (!courseCode) continue;

                    const courseInfo = courseCategoryMap[courseCode] || {};

                    courses.push({
                        name: "Planned 4th Year",
                        courseCode: courseCode,
                        courseDesc: cols[6]?.replace(/"/g, "").trim() || "Planned Course",
                        category: normalizeCategory(courseInfo.category || cols[8]),
                        credits: courseInfo.credits || parseFloat(cols[14]) || 0,
                        academicYear: "4th Year"
                    });
                }
            }

            if (courses.length > 0) {
                foundAny = true;
                renderSemesterTable(term.name, courses, resultDiv);
                allCoursesGlobal.push(...courses);
            }

        } catch (err) {
            console.error("Error loading file:", term.file, err);
        }
    }

    if (foundAny) {
        renderOverallCategoryTable(resultDiv);
    } else {
        alert("Student ID not found in any term");
    }
}


// ===============================
// RENDER SEMESTER TABLE (WITH CREDITS)
// ===============================
function renderSemesterTable(title, courses, container) {

    const uniqueCourses = [];
    const seenCodes = new Set();
    let semesterTotalCredits = 0;

    courses.forEach(c => {
        if (!seenCodes.has(c.courseCode)) {
            seenCodes.add(c.courseCode);
            uniqueCourses.push(c);
            semesterTotalCredits += c.credits || 0;
        }
    });

    if (uniqueCourses.length === 0) return;

    container.innerHTML += `
        <h3>${title} Registered Courses</h3>
        <p><b>Student Name:</b> ${uniqueCourses[0].name}</p>
        <p><b>Academic Year:</b> ${uniqueCourses[0].academicYear}</p>

        <table border="1" cellpadding="6" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Category</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Credits</th>
            </tr>

            ${uniqueCourses.map((c, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${c.category}</td>
                    <td>${c.courseCode}</td>
                    <td>${c.courseDesc}</td>
                    <td>${c.credits}</td>
                </tr>
            `).join("")}

            <tr style="font-weight:bold; background:#f2f2f2;">
                <td colspan="4">Total Semester Credits</td>
                <td>${semesterTotalCredits}</td>
            </tr>
        </table>
        <br>
    `;
}


// ===============================
// OVERALL GRADUATION PROGRESS
// ===============================
function renderOverallCategoryTable(container) {

    const overallCount = {};
    const seenCodes = new Set();

    const uniqueAllCourses = allCoursesGlobal.filter(c => {
        if (!seenCodes.has(c.courseCode)) {
            seenCodes.add(c.courseCode);
            return true;
        }
        return false;
    });

    let totalCredits = 0;

    uniqueAllCourses.forEach(c => {
        const cat = c.category || "N/A";
        if (!overallCount[cat]) overallCount[cat] = 0;
        overallCount[cat]++;
        totalCredits += c.credits || 0;
    });

    let totalRemainingCourses = 0;

    container.innerHTML += `
        <h2 class="section-heading">Overall Graduation Progress</h2>

        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Category</th>
                <th>Required</th>
                <th>Completed</th>
                <th>Remaining</th>
            </tr>

            ${Object.keys(graduationRequirements).map(cat => {

                const completed = overallCount[cat] || 0;
                const required = graduationRequirements[cat];
                const remaining = Math.max(required - completed, 0);

                totalRemainingCourses += remaining;

                return `
                    <tr class="${remaining > 0 ? 'row-red' : 'row-green'}">
                        <td>${cat}</td>
                        <td>${required}</td>
                        <td>${completed}</td>
                        <td>${remaining}</td>
                    </tr>
                `;
            }).join("")}

            <tr style="background:#f2f2f2; font-weight:bold;">
                <td colspan="3">Total Remaining Before 4th Year</td>
                <td>${totalRemainingCourses}</td>
            </tr>
        </table>

        <h3>Total Credits Completed (Till Now): ${totalCredits}</h3>
        <br>
    `;

    const eligible = totalRemainingCourses === 0;

    container.innerHTML += `
        <h2 style="color:${eligible ? 'green' : 'red'};">
            ${eligible 
                ? '🎓 ELIGIBLE FOR GRADUATION'
                : `❌ NOT ELIGIBLE – Need to complete ${totalRemainingCourses} more course(s)`
            }
        </h2>
        <br><br>
    `;

    renderExitRequirementsTable(container, uniqueAllCourses);
}


// ===============================
// EXIT REQUIREMENTS TABLE
// ===============================
function renderExitRequirementsTable(container, uniqueAllCourses) {

    // Sum completed credits per category
    const creditsByCategory = {};
    uniqueAllCourses.forEach(c => {
        const cat = c.category || "N/A";
        if (!creditsByCategory[cat]) creditsByCategory[cat] = 0;
        creditsByCategory[cat] += c.credits || 0;
    });

    let totalRequired  = 0;
    let totalCompleted = 0;

    const rows = exitCreditRequirements.map(item => {
        const completed = creditsByCategory[item.code] || 0;
        const remaining = Math.max(item.required - completed, 0);
        totalRequired  += item.required;
        totalCompleted += completed;
        return { ...item, completed, remaining };
    });

    const totalRemaining = Math.max(totalRequired - totalCompleted, 0);

    container.innerHTML += `
        <h2 class="section-heading">Know Your Exit Requirements</h2>
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Category</th>
                <th>Code</th>
                <th>Required Credits</th>
                <th>Completed Credits</th>
                <th>Remaining Credits</th>
            </tr>
            ${rows.map((r, i) => `
                <tr class="${r.remaining > 0 ? 'row-red' : 'row-green'}">
                    <td>${i + 1}</td>
                    <td>${r.name}</td>
                    <td>${r.code}</td>
                    <td>${r.required}</td>
                    <td>${r.completed}</td>
                    <td>${r.remaining}</td>
                </tr>
            `).join("")}
            <tr class="${totalRemaining > 0 ? 'row-red' : 'row-green'}" style="font-weight:bold;">
                <td colspan="3">Total</td>
                <td>${totalRequired}</td>
                <td>${totalCompleted}</td>
                <td>${totalRemaining}</td>
            </tr>
        </table>
        <br><br>
    `;
}

function normalizeCategory(categoryRaw) {
    const category = (categoryRaw || "")
        .replace(/"/g, "")
        .trim()
        .toUpperCase();

    const aliasMap = {
        OE: "OEC",
        CP: "PRI",
        FC: "FCC"
    };

    return aliasMap[category] || category || "N/A";
}