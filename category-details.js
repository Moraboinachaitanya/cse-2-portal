function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || "";
}

function uniqueByCourseCode(courses) {
    const seen = new Set();
    return courses.filter(course => {
        const code = (course.courseCode || "").trim().toUpperCase();
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
    });
}

function renderCategoryCourses() {
    const category = getQueryParam("category").trim().toUpperCase();
    const studentIdFromQuery = getQueryParam("studentId").trim();
    const source = getQueryParam("source").trim().toLowerCase();
    const studentId = studentIdFromQuery || localStorage.getItem("studentSnapshotId") || "Unknown";

    const titleEl = document.getElementById("detailsTitle");
    const subtitleEl = document.getElementById("detailsSubtitle");
    const resultEl = document.getElementById("detailsResult");
    const backLinkEl = document.getElementById("backLink");

    if (backLinkEl) {
        if (source === "dashboard") {
            backLinkEl.href = "dashboard.html";
            backLinkEl.textContent = "Back to Teacher Dashboard";
        } else {
            backLinkEl.href = `student.html?studentId=${encodeURIComponent(studentId)}`;
            backLinkEl.textContent = "Back to Student Portal";
        }
    }

    titleEl.textContent = category ? `${category} Course Details` : "Category Course Details";
    subtitleEl.innerHTML = `<b>Student ID:</b> ${studentId}`;

    const snapshotRaw = localStorage.getItem("studentCourseSnapshot");
    if (!snapshotRaw) {
        resultEl.innerHTML = "<p>No student course data found. Please open Dashboard, search student, and click a category again.</p>";
        return;
    }

    let allCourses = [];
    try {
        allCourses = JSON.parse(snapshotRaw);
    } catch (error) {
        resultEl.innerHTML = "<p>Could not read stored course data. Please return to Dashboard and try again.</p>";
        return;
    }

    const filtered = uniqueByCourseCode(
        allCourses.filter(course => {
            const cat = (course.category || "").trim().toUpperCase();
            return cat === category;
        })
    );

    if (filtered.length === 0) {
        resultEl.innerHTML = `<p>No courses found for <b>${category}</b>.</p>`;
        return;
    }

    let totalCredits = 0;
    filtered.forEach(course => {
        totalCredits += Number(course.credits) || 0;
    });

    resultEl.innerHTML = `
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Semester</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Credits</th>
            </tr>
            ${filtered.map((course, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${course.semester || "N/A"}</td>
                    <td>${course.courseCode || "-"}</td>
                    <td>${course.courseDesc || "-"}</td>
                    <td>${course.credits || 0}</td>
                </tr>
            `).join("")}
            <tr style="font-weight:bold; background:#f2f2f2;">
                <td colspan="4">Total ${category} Credits Completed</td>
                <td>${totalCredits}</td>
            </tr>
        </table>
    `;
}

renderCategoryCourses();
