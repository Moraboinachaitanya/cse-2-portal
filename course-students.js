function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || "";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderCourseStudentsPage() {
    const titleEl = document.getElementById("courseStudentsTitle");
    const subtitleEl = document.getElementById("courseStudentsSubtitle");
    const resultEl = document.getElementById("courseStudentsResult");
    const backLinkEl = document.getElementById("courseStudentsBackLink");

    const courseCodeFromQuery = getQueryParam("courseCode");
    const source = getQueryParam("source").trim().toLowerCase();

    if (backLinkEl && source === "dashboard") {
        backLinkEl.href = "dashboard.html";
        backLinkEl.textContent = "Back to Teacher Dashboard";
    }

    const stored = localStorage.getItem("selectedCourseStudents");
    if (!stored) {
        resultEl.innerHTML = "<p>No selected course details found. Please open Teacher Login and click Open Details Page again.</p>";
        return;
    }

    let selected = null;
    try {
        selected = JSON.parse(stored);
    } catch (error) {
        resultEl.innerHTML = "<p>Could not read selected course details. Please go back and try again.</p>";
        return;
    }

    const selectedCode = (selected.courseCode || "").trim();
    const queryCode = (courseCodeFromQuery || "").trim();

    if (queryCode && selectedCode && queryCode.toUpperCase() !== selectedCode.toUpperCase()) {
        resultEl.innerHTML = "<p>Selected course does not match current details. Please return and open the course again.</p>";
        return;
    }

    const students = Array.isArray(selected.studentDetails) ? selected.studentDetails : [];
    titleEl.textContent = `${selectedCode || "Course"} Student Details`;
    subtitleEl.innerHTML = `<b>Course Name:</b> ${escapeHtml(selected.courseName || "N/A")}<br><b>Students Completed:</b> ${selected.completedStudents || 0}`;

    resultEl.innerHTML = `
        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <th>Sl No</th>
                <th>Student ID</th>
                <th>Student Name</th>
            </tr>
            ${students.map((s, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(s.studentId || "-")}</td>
                    <td>${escapeHtml(s.studentName || "N/A")}</td>
                </tr>
            `).join("") || `<tr><td colspan="3">No students found for this course.</td></tr>`}
        </table>
    `;
}

renderCourseStudentsPage();
