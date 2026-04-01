// ===============================
// GLOBAL VARIABLES
// ===============================
let courseCategoryMap = {};
let allCoursesGlobal = [];
let currentStudentIdGlobal = "";
let specializationByStudentId = {};
let currentStudentSpecializationGlobal = "N/A";
let cgpaByStudentId = {};
let currentStudentCgpaGlobal = "N/A";
let teacherCourseCompletionRowsCache = null;
let studentHeaderRendered = false;

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
// LOAD STUDENT SPECIALIZATIONS
// ===============================
async function loadSpecializations() {
    if (Object.keys(specializationByStudentId).length > 0) {
        return;
    }

    try {
        const res = await fetch("Specializations.csv");
        if (!res.ok) {
            console.warn("Specializations file not found or unreadable");
            return;
        }

        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const isZipWorkbook = bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4B;

        if (isZipWorkbook) {
            if (typeof XLSX === "undefined") {
                console.error("XLSX library is required to read Specializations.csv workbook");
                return;
            }

            const workbook = XLSX.read(buffer, { type: "array" });
            specializationByStudentId = extractSpecializationsFromWorkbook(workbook);
            return;
        }

        const text = new TextDecoder("utf-8").decode(buffer);
        specializationByStudentId = extractSpecializationsFromCsvText(text);
    } catch (error) {
        console.error("Error loading specializations:", error);
    }
}

// ===============================
// LOAD STUDENT CGPA
// ===============================
async function loadStudentCgpa() {
    if (Object.keys(cgpaByStudentId).length > 0) {
        return;
    }

    try {
        const res = await fetch("students cgpa.csv");
        if (!res.ok) {
            console.warn("students cgpa.csv not found or unreadable");
            return;
        }

        const text = await res.text();
        cgpaByStudentId = extractCgpaFromCsvText(text);
    } catch (error) {
        console.error("Error loading students cgpa file:", error);
    }
}

function extractCgpaFromCsvText(text) {
    const result = {};

    const rows = text
        .replace(/\r/g, "")
        .split("\n")
        .filter(row => row.trim() !== "")
        .map(row => row.split(","));

    if (!rows.length) return result;

    const headerRowIndex = rows.findIndex(row => {
        const normalized = row.map(cell => normalizeHeader(cell));
        return (
            normalized.some(cell => cell.includes("rollno") || cell.includes("universityid") || cell.includes("studentid")) &&
            normalized.some(cell => cell === "cgpa" || cell.includes("cgpa"))
        );
    });

    if (headerRowIndex === -1) return result;

    const headers = rows[headerRowIndex].map(cell => normalizeHeader(cell));
    const idIndex = headers.findIndex(h => h.includes("rollno") || h.includes("universityid") || h.includes("studentid"));
    const cgpaIndex = headers.findIndex(h => h === "cgpa" || h.includes("cgpa"));

    if (idIndex === -1 || cgpaIndex === -1) return result;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const id = normalizeStudentId(row[idIndex]);
        const cgpa = String(row[cgpaIndex] || "").replace(/"/g, "").trim();

        if (id && cgpa) {
            result[id] = cgpa;
        }
    }

    return result;
}

function extractSpecializationsFromWorkbook(workbook) {
    const result = {};

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const extracted = extractSpecializationsFromRows(rows);

        Object.assign(result, extracted);
        if (Object.keys(result).length > 0) {
            break;
        }
    }

    return result;
}

function extractSpecializationsFromCsvText(text) {
    const rows = text
        .replace(/\r/g, "")
        .split("\n")
        .filter(row => row.trim() !== "")
        .map(row => row.split(","));

    return extractSpecializationsFromRows(rows);
}

function extractSpecializationsFromRows(rows) {
    const result = {};
    if (!rows || rows.length === 0) return result;

    const headerRowIndex = rows.findIndex(row => {
        const normalized = row.map(cell => normalizeHeader(cell));
        return (
            normalized.some(cell => cell.includes("specialization")) &&
            normalized.some(cell =>
                cell.includes("universityid") ||
                cell.includes("studentid") ||
                cell.includes("rollno")
            )
        );
    });

    if (headerRowIndex === -1) {
        return result;
    }

    const headers = rows[headerRowIndex].map(cell => normalizeHeader(cell));
    const idIndex = headers.findIndex(h =>
        h.includes("universityid") || h.includes("studentid") || h.includes("rollno")
    );
    const specializationIndex = headers.findIndex(h => h.includes("specialization"));

    if (idIndex === -1 || specializationIndex === -1) {
        return result;
    }

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const id = normalizeStudentId(row[idIndex]);
        const specialization = String(row[specializationIndex] || "").replace(/"/g, "").trim();

        if (id && specialization) {
            result[id] = specialization;
        }
    }

    return result;
}

function normalizeStudentId(value) {
    const normalized = String(value || "")
        .replace(/"/g, "")
        .replace(/\s+/g, "")
        .trim();

    return normalized.endsWith(".0") ? normalized.slice(0, -2) : normalized;
}

function normalizeHeader(value) {
    return String(value || "")
        .replace(/"/g, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isTeacherPortalPage() {
    return window.location.pathname.toLowerCase().includes("dashboard.html");
}

async function loadTeacherCourseCompletionRows() {
    if (teacherCourseCompletionRowsCache) {
        return teacherCourseCompletionRowsCache;
    }

    if (Object.keys(courseCategoryMap).length === 0) {
        await loadMasterCourses();
    }

    const files = [
        "ai_ds_1_1.csv",
        "ai_ds_1_2.csv",
        "ai_ds_summer.csv",
        "ai_ds_2_1.csv",
        "ai_ds_2_2.csv",
        "ai_ds_summer_2.csv",
        "ai_ds_3_1.csv",
        "ai_ds_3_2.csv"
    ];

    const courseMap = {};

    for (const file of files) {
        try {
            const res = await fetch(file);
            if (!res.ok) continue;

            const text = await res.text();
            const rows = text.replace(/\r/g, "").trim().split("\n");

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(",");
                const studentId = normalizeStudentId(cols[1]);
                const studentName = (cols[2] || "")
                    .replace(/"/g, "")
                    .trim() || "N/A";
                const courseCode = (cols[3] || "")
                    .replace(/"/g, "")
                    .replace(/\s+/g, "")
                    .toUpperCase()
                    .trim();
                const courseName = (cols[5] || "")
                    .replace(/"/g, "")
                    .trim() || "N/A";

                if (!studentId || !courseCode) continue;

                const key = `${courseCode}||${courseName}`;
                if (!courseMap[key]) {
                    courseMap[key] = {
                        courseCode,
                        courseName,
                        studentsById: new Map()
                    };
                }

                if (!courseMap[key].studentsById.has(studentId)) {
                    courseMap[key].studentsById.set(studentId, studentName);
                }
            }
        } catch (error) {
            console.error("Error loading course completion counts from:", file, error);
        }
    }

    teacherCourseCompletionRowsCache = Object.values(courseMap)
        .map(item => {
            const studentDetails = Array.from(item.studentsById.entries())
                .map(([studentId, studentName]) => ({ studentId, studentName }))
                .sort((a, b) =>
                    a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: "base" })
                );

            const sortedStudentIds = studentDetails.map(s => s.studentId);

            const sortedStudentDetails = studentDetails.map(s => ({
                studentId: s.studentId,
                studentName: s.studentName
            }));

            return {
                courseCode: item.courseCode,
                courseName: item.courseName,
                category: normalizeCategory((courseCategoryMap[item.courseCode] || {}).category || "N/A"),
                completedStudents: sortedStudentIds.length,
                studentIds: sortedStudentIds,
                studentDetails: sortedStudentDetails
            };
        })
        .sort((a, b) => {
            if (b.completedStudents !== a.completedStudents) {
                return b.completedStudents - a.completedStudents;
            }
            return a.courseCode.localeCompare(b.courseCode);
        });

    return teacherCourseCompletionRowsCache;
}

async function renderTeacherCourseCompletionTable(container, mode = "replace") {
    const rows = await loadTeacherCourseCompletionRows();
    const write = mode === "append" ? "append" : "replace";

    if (!rows.length) {
        const emptyHtml = `
            <h2 class="section-heading">Course-wise Student Completion Count</h2>
            <p>No completion data found.</p>
            <br>
        `;

        if (write === "append") {
            container.innerHTML += emptyHtml;
        } else {
            container.innerHTML = emptyHtml;
        }
        return;
    }

    const tableHtml = `
        <h2 class="section-heading">Course-wise Student Completion Count</h2>
        <p><b>Total Courses:</b> ${rows.length}</p>
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Students Completed</th>
                <th>Action</th>
            </tr>
            ${rows.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><b>${row.courseCode}</b></td>
                    <td>${escapeHtml(row.courseName)}</td>
                    <td>${row.completedStudents}</td>
                    <td>
                        <button type="button" class="course-detail-btn" data-course-index="${index}">View Details Below</button>
                    </td>
                </tr>
            `).join("")}
        </table>
        <div id="teacherCourseDetailsPanel" style="margin-top: 16px; text-align: left; border: 1px solid #ccc; border-radius: 8px; padding: 12px; background: #f9f9f9;">
            <p><b>Course Details:</b> Click "View Details Below" for any course to see student IDs here.</p>
        </div>
        <br>
    `;

    if (write === "append") {
        container.innerHTML += tableHtml;
    } else {
        container.innerHTML = tableHtml;
    }

    const detailsPanel = container.querySelector("#teacherCourseDetailsPanel");
    const detailButtons = container.querySelectorAll(".course-detail-btn");

    detailButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const rowIndex = Number(btn.getAttribute("data-course-index"));
            const selected = rows[rowIndex];

            if (!selected || !detailsPanel) return;

            const studentIdList = selected.studentIds.map(id => escapeHtml(id)).join(", ");
            const studentDetailsList = selected.studentDetails
                .map(s => `${escapeHtml(s.studentId)} - ${escapeHtml(s.studentName)}`)
                .join("<br>");

            detailsPanel.innerHTML = `
                <h3 style="margin-bottom: 8px;">${escapeHtml(selected.courseCode)} - ${escapeHtml(selected.courseName)}</h3>
                <p><b>Students Completed:</b> ${selected.completedStudents}</p>
                <p><b>Student IDs:</b> ${studentIdList || "N/A"}</p>
                <p><b>Student Details (ID - Name):</b><br>${studentDetailsList || "N/A"}</p>
            `;
        });
    });
}

async function viewCourseCompletionReport() {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<p>Loading course completion report...</p>";
    
    if (Object.keys(courseCategoryMap).length === 0) {
        await loadMasterCourses();
    }
    
    await renderTeacherCourseCompletionTable(resultDiv);
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

    await loadSpecializations();
    await loadStudentCgpa();

    const studentId = document.getElementById("studentId").value.trim();
    const normalizedInputId = normalizeStudentId(studentId);
    currentStudentIdGlobal = studentId;
    currentStudentSpecializationGlobal = specializationByStudentId[normalizeStudentId(studentId)] || "N/A";
    currentStudentCgpaGlobal = cgpaByStudentId[normalizeStudentId(studentId)] || "N/A";
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    allCoursesGlobal = [];
    studentHeaderRendered = false;

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
    let foundStudentTermData = false;

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
                    const rowStudentId = normalizeStudentId(cols[1]);
                    if (rowStudentId !== normalizedInputId) continue;

                    const courseCode = cols[3]
                        ?.replace(/"/g, "")
                        .replace(/\s+/g, "")
                        .toUpperCase()
                        .trim();

                    const courseInfo = courseCategoryMap[courseCode] || {};

                    courses.push({
                        name: cols[2]?.replace(/"/g, "").trim() || "Planned Course",
                        specialization: currentStudentSpecializationGlobal,
                        courseCode: courseCode,
                        courseDesc: cols[5]?.replace(/"/g, "").trim(),
                        teacher: cols[15]?.replace(/"/g, "").trim() || "N/A",
                        category: normalizeCategory(courseInfo.category || cols[6]),
                        credits: courseInfo.credits || 0,
                        academicYear: cols[8]?.replace(/"/g, "").trim() || "4th Year",
                        semester: term.name,
                        sourceType: "student"
                    });
                }

                if (term.type === "plan") {
                    // Show 4th-year plan only when we have at least one matched student-semester record.
                    if (!foundStudentTermData) continue;

                    const courseCode = cols[5]
                        ?.replace(/"/g, "")
                        .replace(/\s+/g, "")
                        .toUpperCase()
                        .trim();

                    if (!courseCode) continue;

                    const courseInfo = courseCategoryMap[courseCode] || {};

                    courses.push({
                        name: "Planned 4th Year",
                        specialization: currentStudentSpecializationGlobal,
                        courseCode: courseCode,
                        courseDesc: cols[6]?.replace(/"/g, "").trim() || "Planned Course",
                        teacher: cols[19]?.replace(/"/g, "").trim() || cols[17]?.replace(/"/g, "").trim() || "N/A",
                        category: normalizeCategory(courseInfo.category || cols[8]),
                        credits: courseInfo.credits || parseFloat(cols[14]) || 0,
                        academicYear: "4th Year",
                        semester: term.name,
                        sourceType: "plan"
                    });
                }
            }

            if (courses.length > 0) {
                foundAny = true;
                if (term.type === "student") {
                    foundStudentTermData = true;
                }
                if (!studentHeaderRendered && term.type === "student") {
                    renderStudentHeader(courses[0], resultDiv);
                    studentHeaderRendered = true;
                }
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
// RENDER STUDENT HEADER (NAME & SPECIALIZATION - ONCE)
// ===============================
function renderStudentHeader(course, container) {
    const studentName = course.name || "N/A";
    const studentSpecialization = course.specialization || "N/A";
    const studentCgpa = currentStudentCgpaGlobal || "N/A";

    container.innerHTML += `
        <h2 class="section-heading">Student Information</h2>
        <p><b>Student Name:</b> ${studentName}</p>
        <p><b>Specialization:</b> ${studentSpecialization}</p>
        <p><b>CGPA:</b> ${studentCgpa}</p>
        <hr>
        <br>
    `;
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
// COMPLETED COURSE NAME COUNTS
// ===============================
function renderCourseCountSummary(container) {
    const allUniqueCodes = new Set();
    const completedUniqueCodes = new Set();
    const plannedUniqueCodes = new Set();

    allCoursesGlobal.forEach(course => {
        const code = (course.courseCode || "").trim().toUpperCase();
        if (!code) return;

        allUniqueCodes.add(code);

        if (course.sourceType === "student") {
            completedUniqueCodes.add(code);
        } else if (course.sourceType === "plan") {
            plannedUniqueCodes.add(code);
        }
    });

    container.innerHTML += `
        <h2 class="section-heading">Course Count Summary</h2>
        <p><b>Total Courses (Unique):</b> ${allUniqueCodes.size}</p>
        <p><b>Completed Courses (Unique):</b> ${completedUniqueCodes.size}</p>
        <p><b>Planned Courses (Unique):</b> ${plannedUniqueCodes.size}</p>
        <hr>
        <br>
    `;
}

function renderCompletedCourseNameCountTable(container) {
    const completedCourses = allCoursesGlobal.filter(course => course.sourceType === "student");

    if (completedCourses.length === 0) return;

    const courseCountMap = {};
    const uniqueCompletedCodes = new Set();

    completedCourses.forEach(course => {
        const code = (course.courseCode || "-").trim().toUpperCase();
        const name = (course.courseDesc || "-").trim();
        const key = `${code}||${name}`;

        uniqueCompletedCodes.add(code);

        if (!courseCountMap[key]) {
            courseCountMap[key] = {
                code,
                name,
                count: 0
            };
        }

        courseCountMap[key].count += 1;
    });

    const rows = Object.values(courseCountMap).sort((a, b) => a.code.localeCompare(b.code));

    container.innerHTML += `
        <h2 class="section-heading">Completed Courses Name Count</h2>
        <p><b>Total Completed Courses (Unique):</b> ${uniqueCompletedCodes.size}</p>
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Count</th>
            </tr>
            ${rows.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.code}</td>
                    <td>${row.name}</td>
                    <td>${row.count}</td>
                </tr>
            `).join("")}
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

    // Keep a snapshot so category-details page can open directly from link.
    try {
        localStorage.setItem("studentCourseSnapshot", JSON.stringify(uniqueAllCourses));
        localStorage.setItem("studentSnapshotId", currentStudentIdGlobal || "");
    } catch (error) {
        console.error("Unable to store student snapshot in localStorage:", error);
    }

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
    const sourcePage = window.location.pathname.toLowerCase().includes("dashboard.html")
        ? "dashboard"
        : "student";

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
                <th>Course List</th>
            </tr>
            ${rows.map((r, i) => `
                <tr class="${r.remaining > 0 ? 'row-red' : 'row-green'}">
                    <td>${i + 1}</td>
                    <td>${r.name}</td>
                    <td>
                        <a href="category-details.html?category=${encodeURIComponent(r.code)}&studentId=${encodeURIComponent(currentStudentIdGlobal || "")}&source=${encodeURIComponent(sourcePage)}" target="_blank" rel="noopener noreferrer">
                            ${r.code}
                        </a>
                    </td>
                    <td>${r.required}</td>
                    <td>${r.completed}</td>
                    <td>${r.remaining}</td>
                    <td>
                        <a href="category-details.html?category=${encodeURIComponent(r.code)}&studentId=${encodeURIComponent(currentStudentIdGlobal || "")}&source=${encodeURIComponent(sourcePage)}" target="_blank" rel="noopener noreferrer">
                            View ${r.code} Courses
                        </a>
                    </td>
                </tr>
            `).join("")}
            <tr class="${totalRemaining > 0 ? 'row-red' : 'row-green'}" style="font-weight:bold;">
                <td colspan="4">Total</td>
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
