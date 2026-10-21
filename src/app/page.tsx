"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  BookOpen,
  Users,
  Search,
  Send,
  Calendar,
  Check,
  AlertCircle,
  Award,
  BarChart3,
  FileAudio,
  CreditCard,
  UserPlus,
  Upload,
  Clock,
  ShieldCheck,
  LogOut,
  IndianRupee,
  Sparkles,
  ArrowUpRight,
  X,
} from "lucide-react";

type Role = "ADMIN" | "COUNSELLOR" | "TEACHER";

type Student = {
  student_id: string;
  full_name: string;
  father_name: string | null;
  batch_class: string;
  stream: string | null;
  board?: string | null;
  medium: string | null;
  contact_number: string | null;
  parent_alt_number: string | null;
  total_fees: number;
  fee_paid_till_date: number;
  risk_category: string;
  general_remarks: string | null;
  academic_tag?: string | null;
  e_mandate_status?: string | null;
  next_installment_amount?: number | null;
  next_installment_date?: string | null;
};

type Lead = {
  id: string;
  student_name: string;
  father_name: string | null;
  mobile_number: string;
  batch_class: string;
  board: string;
  medium: string;
  status: string;
  quoted_fee: number;
  demo_date: string | null;
  assigned_counsellor: string;
  created_at: string;
};

type TimelineEntry = {
  id: string;
  student_id: string | null;
  lead_id: string | null;
  entry_type: string;
  author_name: string;
  author_role: string;
  call_duration_seconds: number | null;
  summary: string;
  transcript: string | null;
  action_items: string | null;
  sentiment: string | null;
  created_at: string;
};

type AttendanceStatus = "Present" | "Absent" | "Leave";

export default function PioneerCRM() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<Role>("ADMIN");
  const [currentUserName, setCurrentUserName] = useState<string>("Rohit Dixit (Management)");

  const [activeTab, setActiveTab] = useState<
    "attendance" | "assignments" | "tests" | "directory" | "fees" | "leads"
  >("attendance");

  const [students, setStudents] = useState<Student[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; whatsapp_notified: boolean }>
  >({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [assignmentMode, setAssignmentMode] = useState<"individual" | "class">("class");
  const [targetBatchForHw, setTargetBatchForHw] = useState<string>("Class XII");
  const [selectedStudentForHw, setSelectedStudentForHw] = useState<string>("");
  const [hwSubject, setHwSubject] = useState<string>("Physics");
  const [hwTopic, setHwTopic] = useState<string>("");
  const [hwGiven, setHwGiven] = useState<number>(10);
  const [hwCompleted, setHwCompleted] = useState<number>(10);
  const [hwRemarks, setHwRemarks] = useState<string>("");
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);

  const [testStudentId, setTestStudentId] = useState<string>("");
  const [testCode, setTestCode] = useState<string>("Minor# 01");
  const [testDate, setTestDate] = useState<string>("");
  const [testType, setTestType] = useState<"Objective" | "Subjective">("Subjective");
  const [marksObtained, setMarksObtained] = useState<number>(22);
  const [maxMarks, setMaxMarks] = useState<number>(30);
  const [batchRank, setBatchRank] = useState<string>("3");
  const [testTeacherComments, setTestTeacherComments] = useState<string>("");
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState<boolean>(false);

  const [feeFilter, setFeeFilter] = useState<"all_due" | "today" | "week" | "month" | "overdue">("all_due");

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadFather, setNewLeadFather] = useState("");
  const [newLeadMobile, setNewLeadMobile] = useState("");
  const [newLeadClass, setNewLeadClass] = useState("Class XI");
  const [newLeadBoard, setNewLeadBoard] = useState("CBSE");
  const [newLeadMedium, setNewLeadMedium] = useState("English");
  const [newLeadQuotedFee, setNewLeadQuotedFee] = useState<number>(45000);
  const [newLeadCounsellor, setNewLeadCounsellor] = useState("Komal");

  const [activeStudentModal, setActiveStudentModal] = useState<Student | null>(null);
  const [activeLeadModal, setActiveLeadModal] = useState<Lead | null>(null);
  const [modalTimeline, setModalTimeline] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [modalRisk, setModalRisk] = useState("Active");
  const [modalAcademicTag, setModalAcademicTag] = useState("Good Student");
  const [modalEMandate, setModalEMandate] = useState("Pending");
  const [modalFeePaid, setModalFeePaid] = useState<number>(0);
  const [modalNextFeeAmount, setModalNextFeeAmount] = useState<number>(0);
  const [modalNextFeeDate, setModalNextFeeDate] = useState<string>("");
  const [modalLeadStatus, setModalLeadStatus] = useState("New");
  const [modalNoteText, setModalNoteText] = useState("");
  const [modalAudioFile, setModalAudioFile] = useState<File | null>(null);
  const [modalAudioDuration, setModalAudioDuration] = useState<number>(0);
  const [analyzingCall, setAnalyzingCall] = useState(false);
  const [savingModal, setSavingModal] = useState(false);

  const uniqueBatches = Array.from(
    new Set(["All", "Class XI", "Class XII", "Repeater", "10th", ...students.map((s) => s.batch_class)])
  ).filter(Boolean);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    setTestDate(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchData(selectedDate);
    }
  }, [selectedDate]);

  const handleRoleSwitch = (role: Role) => {
    setCurrentRole(role);
    if (role === "ADMIN") setCurrentUserName("Rohit Dixit / Naveen Sharma (Admin)");
    if (role === "COUNSELLOR") setCurrentUserName("Komal (Counsellor)");
    if (role === "TEACHER") {
      setCurrentUserName("Senior Faculty (Teacher)");
      if (activeTab === "fees" || activeTab === "leads") {
        setActiveTab("attendance");
      }
    }
  };

  async function fetchData(dateToFetch: string) {
    setLoading(true);
    setDbError(null);

    const { data: studentData, error: studentErr } = await supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    if (studentErr) {
      setDbError(`Supabase Error: ${studentErr.message}`);
      setLoading(false);
      return;
    }

    const { data: attData } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("attendance_date", dateToFetch);

    const { data: hwData } = await supabase
      .from("student_assignments")
      .select("*, students(full_name, batch_class, contact_number, parent_alt_number)")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: testData } = await supabase
      .from("test_scores")
      .select("*, students(full_name, batch_class)")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentData) {
      setStudents(studentData);
      const map: Record<string, { status: AttendanceStatus; whatsapp_notified: boolean }> = {};
      studentData.forEach((s) => {
        map[s.student_id] = { status: "Present", whatsapp_notified: false };
      });
      if (attData) {
        attData.forEach((row: any) => {
          map[row.student_id] = {
            status: row.status as AttendanceStatus,
            whatsapp_notified: row.whatsapp_notified || false,
          };
        });
      }
      setAttendanceMap(map);
    }

    if (hwData) setRecentAssignments(hwData);
    if (testData) setRecentTests(testData);
    if (leadData) setLeads(leadData);
    setLoading(false);
  }

  const openStudentProfile = async (st: Student) => {
    setActiveLeadModal(null);
    setActiveStudentModal(st);
    setModalRisk(st.risk_category || "Active");
    setModalAcademicTag(st.academic_tag || "Good Student");
    setModalEMandate(st.e_mandate_status || "Pending");
    setModalFeePaid(st.fee_paid_till_date || 0);
    setModalNextFeeAmount(st.next_installment_amount || 0);
    setModalNextFeeDate(st.next_installment_date || "");
    setModalNoteText("");
    setModalAudioFile(null);

    setLoadingTimeline(true);
    const { data } = await supabase
      .from("activity_timeline")
      .select("*")
      .eq("student_id", st.student_id)
      .order("created_at", { ascending: false });
    setModalTimeline(data || []);
    setLoadingTimeline(false);
  };

  const openLeadProfile = async (ld: Lead) => {
    setActiveStudentModal(null);
    setActiveLeadModal(ld);
    setModalLeadStatus(ld.status || "New");
    setModalNoteText("");
    setModalAudioFile(null);

    setLoadingTimeline(true);
    const { data } = await supabase
      .from("activity_timeline")
      .select("*")
      .eq("lead_id", ld.id)
      .order("created_at", { ascending: false });
    setModalTimeline(data || []);
    setLoadingTimeline(false);
  };

  const handleAudioFileSelect = (file: File | null) => {
    setModalAudioFile(file);
    if (!file) {
      setModalAudioDuration(0);
      return;
    }
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      setModalAudioDuration(Math.round(audio.duration || 0));
    };
    audio.src = URL.createObjectURL(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyzeCallWithAI = async () => {
    if (!modalAudioFile) return alert("Please select an audio call recording first.");
    setAnalyzingCall(true);

    try {
      const base64Data = await fileToBase64(modalAudioFile);
      const targetName = activeStudentModal
        ? `${activeStudentModal.full_name} (${activeStudentModal.student_id})`
        : `${activeLeadModal?.student_name} (Lead)`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "call",
          fileBase64: base64Data,
          mimeType: modalAudioFile.type || "audio/webm",
          context: `Student/Lead: ${targetName}`,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 120)}`);
      }

      if (!res.ok || data.error) {
        alert("AI Error: " + (data.error || "Failed to analyze call"));
        setAnalyzingCall(false);
        return;
      }

      const ai = data.result;
      const newEntry = {
        student_id: activeStudentModal ? activeStudentModal.student_id : null,
        lead_id: activeLeadModal ? activeLeadModal.id : null,
        entry_type: "CALL_AI",
        author_name: currentUserName,
        author_role: currentRole,
        call_duration_seconds: modalAudioDuration || 120,
        summary: ai.summary || "Call analyzed",
        transcript: ai.transcript || "",
        action_items: ai.action_items || "",
        sentiment: ai.sentiment || "Neutral",
      };

      const { error } = await supabase.from("activity_timeline").insert(newEntry);
      if (error) {
        alert("Database error saving call timeline: " + error.message);
      } else {
        setModalAudioFile(null);
        if (activeStudentModal) openStudentProfile(activeStudentModal);
        if (activeLeadModal) openLeadProfile(activeLeadModal);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setAnalyzingCall(false);
  };

  const handleEvaluateAnswerSheet = async () => {
    if (!answerSheetFile) return alert("Please select an answer sheet image/PDF first.");
    setEvaluatingAnswer(true);

    try {
      const base64Data = await fileToBase64(answerSheetFile);

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "answer_sheet",
          fileBase64: base64Data,
          mimeType: answerSheetFile.type || "image/jpeg",
          context: `Test Code: ${testCode}, Type: ${testType}, Max Marks: ${maxMarks}`,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 120)}`);
      }

      if (!res.ok || data.error) {
        alert("AI Grading Error: " + (data.error || "Failed"));
      } else {
        const ai = data.result;
        if (ai.suggested_marks !== undefined) {
          setMarksObtained(Number(ai.suggested_marks) || 0);
        }
        const summaryText =
          `[AI Checked] ${ai.work_summary || ""} | Strong: ${
            ai.strong_area || "-"
          } | Focus: ${ai.focus_area || "-"}`;
        setTestTeacherComments(summaryText);
      }
    } catch (e: any) {
      alert("Error evaluating answer sheet: " + e.message);
    }
    setEvaluatingAnswer(false);
  };

  const handleSaveStudentModal = async () => {
    if (!activeStudentModal) return;
    setSavingModal(true);

    const { error } = await supabase
      .from("students")
      .update({
        risk_category: modalRisk,
        academic_tag: modalAcademicTag,
        e_mandate_status: modalEMandate,
        fee_paid_till_date: modalFeePaid,
        next_installment_amount: modalNextFeeAmount || 0,
        next_installment_date: modalNextFeeDate || null,
      })
      .eq("student_id", activeStudentModal.student_id);

    if (error) {
      alert("Error saving student: " + error.message);
      setSavingModal(false);
      return;
    }

    const timelineInserts: any[] = [];
    const author = currentUserName;
    const role = currentRole;

    if (modalFeePaid !== (activeStudentModal.fee_paid_till_date || 0)) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "FEE_PROMISE",
        author_name: author,
        author_role: role,
        summary: `Fee paid updated to ₹${modalFeePaid.toLocaleString("en-IN")} (Total Fee: ₹${(
          activeStudentModal.total_fees || 0
        ).toLocaleString("en-IN")})`,
      });
    }

    if (modalEMandate !== (activeStudentModal.e_mandate_status || "Pending")) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "COUNSELLOR_NOTE",
        author_name: author,
        author_role: role,
        summary: `E-Mandate status updated to: ${modalEMandate}`,
      });
    }

    if (modalAcademicTag !== (activeStudentModal.academic_tag || "Good Student")) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "TEACHER_REMARK",
        author_name: author,
        author_role: role,
        summary: `Academic category changed to: ${modalAcademicTag}`,
      });
    }

    if (modalRisk !== (activeStudentModal.risk_category || "Active")) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "COUNSELLOR_NOTE",
        author_name: author,
        author_role: role,
        summary: `Account risk status flagged as: ${modalRisk}`,
      });
    }

    if (modalNextFeeDate && modalNextFeeAmount > 0) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "FEE_PROMISE",
        author_name: author,
        author_role: role,
        summary: `Scheduled next fee installment of ₹${modalNextFeeAmount.toLocaleString(
          "en-IN"
        )} expected on ${modalNextFeeDate} (E-Mandate: ${modalEMandate})`,
      });
    }

    if (modalNoteText.trim()) {
      const entryType = role === "TEACHER" ? "TEACHER_REMARK" : "COUNSELLOR_NOTE";
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: entryType,
        author_name: author,
        author_role: role,
        summary: modalNoteText.trim(),
      });
    }

    if (timelineInserts.length > 0) {
      await supabase.from("activity_timeline").insert(timelineInserts);
    }

    setSavingModal(false);
    alert("Profile, fee schedule & timeline successfully updated!");
    setActiveStudentModal(null);
    setModalNoteText("");
    fetchData(selectedDate);
  };

  const handleSaveLeadModal = async (convertToStudent = false) => {
    if (!activeLeadModal) return;
    setSavingModal(true);

    if (convertToStudent) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newStudentId = `ADM26-${randomNum}`;

      const { error: enrollErr } = await supabase.from("students").insert({
        student_id: newStudentId,
        full_name: activeLeadModal.student_name,
        father_name: activeLeadModal.father_name,
        batch_class: activeLeadModal.batch_class,
        board: activeLeadModal.board,
        medium: activeLeadModal.medium,
        contact_number: activeLeadModal.mobile_number,
        total_fees: activeLeadModal.quoted_fee,
        fee_paid_till_date: 0,
        risk_category: "Active",
        e_mandate_status: "Pending",
      });

      if (!enrollErr) {
        await supabase
          .from("leads")
          .update({ status: "Enrolled" })
          .eq("id", activeLeadModal.id);

        await supabase
          .from("activity_timeline")
          .update({ student_id: newStudentId })
          .eq("lead_id", activeLeadModal.id);

        alert(`🎉 Lead converted to Enrolled Student (${newStudentId})!`);
      } else {
        alert("Error converting lead: " + enrollErr.message);
      }
    } else {
      await supabase
        .from("leads")
        .update({ status: modalLeadStatus })
        .eq("id", activeLeadModal.id);
      alert("Lead status updated!");
    }

    setSavingModal(false);
    setActiveLeadModal(null);
    fetchData(selectedDate);
  };

  const filteredStudents = students.filter((s) => {
    const matchesBatch =
      selectedBatch === "All" ||
      (s.batch_class && s.batch_class.toLowerCase().trim() === selectedBatch.toLowerCase().trim());
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesSearch;
  });

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setSaveSuccess(false);
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate) return;
    setSavingAttendance(true);
    const payload = filteredStudents.map((s) => ({
      student_id: s.student_id,
      attendance_date: selectedDate,
      status: attendanceMap[s.student_id]?.status || "Present",
      whatsapp_notified: attendanceMap[s.student_id]?.whatsapp_notified || false,
    }));

    const { error } = await supabase
      .from("attendance_logs")
      .upsert(payload, { onConflict: "student_id,attendance_date" });

    setSavingAttendance(false);
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      alert("Error saving attendance: " + error.message);
    }
  };

  const sendAbsentWhatsApp = async (student: Student, phoneToUse: string | null) => {
    if (!phoneToUse || phoneToUse.length < 10) {
      alert(`No valid 10-digit phone number found for ${student.full_name}`);
      return;
    }
    const formattedDate = new Date(selectedDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const message =
      `🙏 *Namaste from Pioneer Academy, Bikaner*\n\n` +
      `This is an automated attendance alert to inform you that your ward *${student.full_name.toUpperCase()}* (ID: ${student.student_id}, Batch: ${student.batch_class}) is marked *ABSENT* today (*${formattedDate}*).\n\n` +
      `Regular attendance is critical for test preparation. Please inform the academy office if the absence is due to an emergency.\n\n` +
      `– *Academic Team, Pioneer Academy*`;

    window.open(`https://wa.me/91${phoneToUse.slice(-10)}?text=${encodeURIComponent(message)}`, "_blank");

    setAttendanceMap((prev) => ({
      ...prev,
      [student.student_id]: { ...prev[student.student_id], whatsapp_notified: true },
    }));

    await supabase.from("attendance_logs").upsert(
      {
        student_id: student.student_id,
        attendance_date: selectedDate,
        status: "Absent",
        whatsapp_notified: true,
        whatsapp_notified_at: new Date().toISOString(),
      },
      { onConflict: "student_id,attendance_date" }
    );
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetList: Student[] = [];
    if (assignmentMode === "individual") {
      const found = students.find((s) => s.student_id === selectedStudentForHw);
      if (found) targetList = [found];
    } else {
      targetList = students.filter((s) => s.batch_class === targetBatchForHw);
    }
    if (targetList.length === 0) return alert("No students found for this selection.");

    const payload = targetList.map((st) => ({
      student_id: st.student_id,
      subject: hwSubject,
      topic_name: hwTopic,
      assignments_given: hwGiven,
      assignments_completed: hwCompleted,
      teacher_remarks: hwRemarks,
    }));

    const { error } = await supabase.from("student_assignments").insert(payload);
    if (error) {
      alert("Error saving assignment: " + error.message);
    } else {
      alert(`Logged assignment for ${targetList.length} student(s)!`);
      setHwTopic("");
      setHwRemarks("");
      fetchData(selectedDate);
    }
  };

  const handleSaveTestScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testStudentId) return alert("Please select a student.");

    const { error } = await supabase.from("test_scores").insert({
      student_id: testStudentId,
      test_code: testCode,
      test_date: testDate,
      test_type: testType,
      marks_obtained: marksObtained,
      max_marks: maxMarks,
      batch_rank: batchRank,
      teacher_comments: testTeacherComments,
      ai_evaluation_summary: testTeacherComments,
    });

    if (error) {
      alert("Error saving test score: " + error.message);
    } else {
      alert("Test score & AI evaluation saved!");
      setTestTeacherComments("");
      setAnswerSheetFile(null);
      fetchData(selectedDate);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadMobile) return alert("Student Name and Mobile are required.");

    const { error } = await supabase.from("leads").insert({
      student_name: newLeadName,
      father_name: newLeadFather || null,
      mobile_number: newLeadMobile,
      batch_class: newLeadClass,
      board: newLeadBoard,
      medium: newLeadMedium,
      quoted_fee: newLeadQuotedFee,
      assigned_counsellor: newLeadCounsellor,
      status: "New",
    });

    if (error) {
      alert("Error creating lead: " + error.message);
    } else {
      setNewLeadName("");
      setNewLeadFather("");
      setNewLeadMobile("");
      fetchData(selectedDate);
    }
  };

  const handleBulkLeadCsv = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return alert("CSV must have a header row and at least 1 lead.");

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rowsToInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || "";
      });

      const name = rowObj["student name"] || rowObj["name"] || cols[0];
      const mobile = rowObj["mobile"] || rowObj["mobile number"] || rowObj["phone"] || cols[1];
      if (name && mobile) {
        rowsToInsert.push({
          student_name: name,
          father_name: rowObj["father name"] || rowObj["father"] || null,
          mobile_number: mobile.replace(/\D/g, "").slice(-10),
          batch_class: rowObj["class"] || "Class XI",
          board: rowObj["board"] || "CBSE",
          medium: rowObj["medium"] || "English",
          quoted_fee: Number(rowObj["fee"] || 45000),
          status: "New",
          assigned_counsellor: currentUserName.split(" ")[0] || "Komal",
        });
      }
    }

    if (rowsToInsert.length === 0) return alert("Could not parse valid rows from CSV.");
    const { error } = await supabase.from("leads").insert(rowsToInsert);
    if (error) alert("Bulk upload error: " + error.message);
    else {
      alert(`Successfully uploaded ${rowsToInsert.length} leads!`);
      fetchData(selectedDate);
    }
  };

  const todayStr = selectedDate || "2026-10-20";
  const todayDateObj = new Date(todayStr + "T00:00:00");
  const weekEndObj = new Date(todayDateObj);
  weekEndObj.setDate(todayDateObj.getDate() + 7);
  const weekEndStr = weekEndObj.toISOString().split("T")[0];
  const currentYearMonth = todayStr.slice(0, 7);

  const studentsWithBalance = students.filter(
    (s) =>
      s.risk_category !== "Have Left Already" &&
      (s.total_fees || 0) - (s.fee_paid_till_date || 0) > 0
  );

  const totalPendingFeeSum = studentsWithBalance.reduce(
    (acc, s) => acc + ((s.total_fees || 0) - (s.fee_paid_till_date || 0)),
    0
  );

  const dueTodayList = studentsWithBalance.filter(
    (s) => s.next_installment_date === todayStr
  );
  const dueWeekList = studentsWithBalance.filter(
    (s) =>
      s.next_installment_date &&
      s.next_installment_date >= todayStr &&
      s.next_installment_date <= weekEndStr
  );
  const dueMonthList = studentsWithBalance.filter(
    (s) =>
      s.next_installment_date &&
      s.next_installment_date.startsWith(currentYearMonth)
  );
  const overdueList = studentsWithBalance.filter(
    (s) => s.next_installment_date && s.next_installment_date < todayStr
  );

  const sumExpected = (list: Student[]) =>
    list.reduce(
      (acc, s) =>
        acc +
        (s.next_installment_amount && s.next_installment_amount > 0
          ? s.next_installment_amount
          : (s.total_fees || 0) - (s.fee_paid_till_date || 0)),
      0
    );

  const displayedFeeStudents =
    feeFilter === "today"
      ? dueTodayList
      : feeFilter === "week"
      ? dueWeekList
      : feeFilter === "month"
      ? dueMonthList
      : feeFilter === "overdue"
      ? overdueList
      : studentsWithBalance;

  const presentCount = filteredStudents.filter(
    (s) => attendanceMap[s.student_id]?.status === "Present"
  ).length;
  const absentStudents = filteredStudents.filter(
    (s) => attendanceMap[s.student_id]?.status === "Absent"
  );
  const leaveCount = filteredStudents.filter(
    (s) => attendanceMap[s.student_id]?.status === "Leave"
  ).length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
          <img
            src="/logo.jpg"
            alt="Pioneer Academy"
            className="h-24 mx-auto object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-sky-400">
              PIONEER ACADEMY, BIKANER
            </h1>
            <p className="text-xs text-yellow-400 mt-1">
              Staff & Faculty Portal Login
            </p>
          </div>

          <div className="space-y-3 text-left">
            <p className="text-xs text-slate-400 font-semibold uppercase text-center">
              Select Your Department Login
            </p>
            <button
              onClick={() => {
                handleRoleSwitch("ADMIN");
                setIsLoggedIn(true);
              }}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-between cursor-pointer"
            >
              <span>🛡️ Management Login (Rohit / Naveen / Founder)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleRoleSwitch("COUNSELLOR");
                setIsLoggedIn(true);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-between cursor-pointer"
            >
              <span>📞 Counsellor Login (Sales, Fees & Ops)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleRoleSwitch("TEACHER");
                setIsLoggedIn(true);
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-between cursor-pointer"
            >
              <span>👨‍🏫 Faculty / Teacher Login (Academics Only)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-black text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Pioneer Academy Logo"
              className="h-10 w-auto object-contain rounded-md bg-white p-1"
            />
            <div className="border-l border-slate-800 pl-3">
              <h1 className="font-bold text-base tracking-wide text-sky-400 leading-tight">
                PIONEER ACADEMY, BIKANER
              </h1>
              <p className="text-[11px] text-yellow-400 font-medium">
                Logged in as: {currentUserName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "attendance"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              1. Attendance
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "assignments"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              2. Assignments
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "tests"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Award className="w-4 h-4" />
              3. Tests & AI Check
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === "directory"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              4. Student Master ({students.length})
            </button>

            {currentRole !== "TEACHER" && (
              <>
                <button
                  onClick={() => setActiveTab("fees")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    activeTab === "fees"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-emerald-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <IndianRupee className="w-4 h-4" />
                  5. Fee Forecast
                </button>
                <button
                  onClick={() => setActiveTab("leads")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    activeTab === "leads"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-amber-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  6. Sales Leads ({leads.length})
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs shadow-inner">
              <span className="px-2.5 text-slate-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-sky-400" /> Role:
              </span>
              {(["ADMIN", "COUNSELLOR", "TEACHER"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    currentRole === r
                      ? "bg-yellow-400 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsLoggedIn(false)}
              title="Switch Login"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 py-2.5 px-6 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5 text-sky-400 font-bold">
              <BarChart3 className="w-4 h-4" /> Live Institute Pulse:
            </span>
            <span>
              Enrolled: <b className="text-white">{students.length}</b>
            </span>
            <span>
              Present ({selectedDate}): <b className="text-emerald-400">{presentCount}</b>
            </span>
            <span>
              Absent: <b className="text-rose-400">{absentStudents.length}</b>
            </span>
            {currentRole !== "TEACHER" && (
              <>
                <span className="text-emerald-400">
                  Due Today: <b>₹{sumExpected(dueTodayList).toLocaleString("en-IN")}</b>
                </span>
                <span className="text-amber-300">
                  Active Leads: <b>{leads.length}</b>
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            Click any Student or Lead name anywhere to open their <b>360° Timeline & AI Call Drawer</b>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {dbError && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
            ⚠️ {dbError}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Attendance Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Batch / Class
                    </label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition"
                    >
                      {uniqueBatches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Quick Search
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Name or ADM26..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-sm w-48 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || filteredStudents.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-md transition cursor-pointer mt-5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  {savingAttendance ? "Saving..." : "Save Batch Attendance"}
                </button>
              </div>

              {saveSuccess && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Attendance saved for {selectedBatch} ({selectedDate})!
                </div>
              )}

              <div className="flex items-center gap-4 my-5 text-sm">
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                  Total in Batch: <b className="text-slate-900">{filteredStudents.length}</b>
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                  Present: <b>{presentCount}</b>
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-semibold border border-rose-100">
                  Absent: <b>{absentStudents.length}</b>
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                  Leave: <b>{leaveCount}</b>
                </span>
              </div>

              {loading ? (
                <p className="py-16 text-center text-slate-400 text-sm">Loading students...</p>
              ) : (
                <div className="overflow-y-auto max-h-[550px] divide-y divide-slate-100 pr-1">
                  {filteredStudents.map((student) => {
                    const current = attendanceMap[student.student_id]?.status || "Present";
                    return (
                      <div
                        key={student.student_id}
                        className={`py-3.5 px-3 flex items-center justify-between gap-3 rounded-xl transition ${
                          current === "Absent" ? "bg-rose-50/70 border border-rose-100 my-1" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold border border-slate-200">
                              {student.student_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => openStudentProfile(student)}
                              className="font-bold text-slate-900 capitalize cursor-pointer hover:text-sky-600 hover:underline text-left text-sm"
                            >
                              {student.full_name}
                            </button>
                            <span className="text-xs bg-sky-50 text-sky-700 font-medium px-2 py-0.5 rounded-md border border-sky-100">
                              {student.academic_tag || "Good Student"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {student.batch_class} • Ph: {student.contact_number || "N/A"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(["Present", "Absent", "Leave"] as AttendanceStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStatus(student.student_id, st)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                                current === st
                                  ? st === "Present"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : st === "Absent"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "bg-amber-500 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit sticky top-24">
              <h2 className="font-bold text-base flex items-center gap-2 text-rose-700 pb-3 border-b border-slate-100">
                <AlertCircle className="w-5 h-5" />
                Absentee WhatsApp Queue ({absentStudents.length})
              </h2>
              {absentStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  No students marked Absent in {selectedBatch} for {selectedDate}.
                </div>
              ) : (
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {absentStudents.map((st) => {
                    const notified = attendanceMap[st.student_id]?.whatsapp_notified;
                    return (
                      <div
                        key={st.student_id}
                        className={`p-4 rounded-xl border shadow-2xs ${
                          notified
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-rose-50/40 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm capitalize text-slate-900">{st.full_name}</span>
                          <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border">{st.student_id}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {st.contact_number && (
                            <button
                              onClick={() => sendAbsentWhatsApp(st, st.contact_number)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              WA Student ({st.contact_number})
                            </button>
                          )}
                          {st.parent_alt_number && (
                            <button
                              onClick={() => sendAbsentWhatsApp(st, st.parent_alt_number)}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              WA Parent ({st.parent_alt_number})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleSaveAssignment}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 h-fit"
            >
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 text-slate-900">Log Homework / Assignment</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAssignmentMode("class")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    assignmentMode === "class" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Complete Batch / Class
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode("individual")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    assignmentMode === "individual" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Individual Student
                </button>
              </div>

              {assignmentMode === "class" ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Target Batch / Class
                  </label>
                  <select
                    value={targetBatchForHw}
                    onChange={(e) => setTargetBatchForHw(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none font-medium"
                  >
                    {uniqueBatches
                      .filter((b) => b !== "All")
                      .map((b) => (
                        <option key={b} value={b}>
                          {b} ({students.filter((s) => s.batch_class === b).length} Students)
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Select Student
                  </label>
                  <select
                    required
                    value={selectedStudentForHw}
                    onChange={(e) => setSelectedStudentForHw(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.full_name} ({s.student_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Topic / DPP Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrostatics DPP-2"
                    value={hwTopic}
                    onChange={(e) => setHwTopic(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Given
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hwGiven}
                    onChange={(e) => setHwGiven(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Completed
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hwCompleted}
                    onChange={(e) => setHwCompleted(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Teacher's Remarks
                </label>
                <textarea
                  rows={2}
                  value={hwRemarks}
                  onChange={(e) => setHwRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer shadow-md transition"
              >
                Save Assignment Record
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Recent Homework & Assignment Logs
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentAssignments.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm capitalize text-slate-900">
                          {log.students?.full_name}
                        </span>
                        <span className="text-xs font-mono bg-slate-100 px-2.5 py-0.5 rounded-md border text-slate-700 font-semibold">
                          {log.student_id}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {log.subject}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        <b>Topic:</b> {log.topic_name} •{" "}
                        <b>
                          Completed: {log.assignments_completed}/{log.assignments_given}
                        </b>
                      </p>
                      {log.teacher_remarks && (
                        <p className="text-xs text-slate-700 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{log.teacher_remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tests" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleSaveTestScore}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 h-fit"
            >
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-900">
                <Award className="w-5 h-5 text-amber-600" />
                Upload Test Score & AI Answer Checker
              </h2>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Free AI Answer Sheet Checker (Gemini Vision)
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Upload a photo/PDF of a student's subjective answer sheet to auto-grade and generate a PTM work summary.
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setAnswerSheetFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white cursor-pointer"
                />
                {answerSheetFile && (
                  <button
                    type="button"
                    onClick={handleEvaluateAnswerSheet}
                    disabled={evaluatingAnswer}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 shadow-sm transition"
                  >
                    {evaluatingAnswer
                      ? "✨ Gemini AI is checking answer sheet..."
                      : "✨ Auto-Check Answer Sheet & Generate Summary"}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Select Student
                </label>
                <select
                  required
                  value={testStudentId}
                  onChange={(e) => setTestStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.full_name} ({s.student_id} - {s.batch_class})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Test Code
                  </label>
                  <input
                    type="text"
                    required
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Test Date
                  </label>
                  <input
                    type="date"
                    required
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    required
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Rank
                  </label>
                  <input
                    type="text"
                    value={batchRank}
                    onChange={(e) => setBatchRank(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Work Summary & Teacher PTM Comments
                </label>
                <textarea
                  rows={4}
                  value={testTeacherComments}
                  onChange={(e) => setTestTeacherComments(e.target.value)}
                  placeholder="AI evaluation summary or manual teacher remarks appear here..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer shadow-md transition"
              >
                Save Score & PTM Summary
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Recent Test Scores & AI Answer Evaluations ({recentTests.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentTests.map((t) => {
                  const pct = Math.round((t.marks_obtained / Math.max(t.max_marks, 1)) * 100);
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 space-y-2 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm capitalize text-slate-900">
                            {t.students?.full_name}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 px-2.5 py-0.5 rounded-md border text-slate-700 font-semibold">
                            {t.student_id}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                            {t.test_code}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-xl border">
                          {t.marks_obtained} / {t.max_marks} ({pct}%)
                        </span>
                      </div>
                      {t.teacher_comments && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {t.teacher_comments}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "directory" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Enrolled Student Master ({filteredStudents.length} Students)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any student to open their 360° Center Profile, AI Call Recorder, Timeline & Academic Tags.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm bg-slate-50 font-medium focus:bg-white outline-none"
                >
                  {uniqueBatches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm w-56 bg-slate-50 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Academic Category</th>
                    {currentRole !== "TEACHER" && (
                      <>
                        <th className="py-3 px-4">E-Mandate</th>
                        <th className="py-3 px-4">Fee Paid / Total</th>
                        <th className="py-3 px-4">Next Due Date</th>
                      </>
                    )}
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.slice(0, 150).map((s) => (
                    <tr
                      key={s.student_id}
                      onClick={() => openStudentProfile(s)}
                      className="hover:bg-sky-50/70 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-sky-700">
                        {s.student_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold capitalize text-slate-900">
                        {s.full_name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{s.batch_class}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border">
                          {s.academic_tag || "Good Student"}
                        </span>
                      </td>
                      {currentRole !== "TEACHER" && (
                        <>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                                s.e_mandate_status === "Done"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {s.e_mandate_status || "Pending"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium">
                            <b className="text-emerald-700">
                              ₹{(s.fee_paid_till_date || 0).toLocaleString("en-IN")}
                            </b>{" "}
                            / ₹{(s.total_fees || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {s.next_installment_date
                              ? `${s.next_installment_date} (₹${(
                                  s.next_installment_amount || 0
                                ).toLocaleString("en-IN")})`
                              : "-"}
                          </td>
                        </>
                      )}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-xl ${
                            s.risk_category === "High Risk"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {s.risk_category || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "fees" && currentRole !== "TEACHER" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                onClick={() => setFeeFilter("all_due")}
                className={`p-5 rounded-2xl border cursor-pointer transition shadow-2xs ${
                  feeFilter === "all_due"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-75">
                  Total Pending Fees
                </span>
                <p className="text-2xl font-black mt-2">
                  ₹{totalPendingFeeSum.toLocaleString("en-IN")}
                </p>
                <span className="text-xs opacity-75 mt-1 block">
                  {studentsWithBalance.length} Students with balance
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("today")}
                className={`p-5 rounded-2xl border cursor-pointer transition shadow-2xs ${
                  feeFilter === "today"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-emerald-400"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-75">
                  Expected Today ({todayStr})
                </span>
                <p className="text-2xl font-black mt-2">
                  ₹{sumExpected(dueTodayList).toLocaleString("en-IN")}
                </p>
                <span className="text-xs opacity-75 mt-1 block">
                  {dueTodayList.length} Students promised today
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("week")}
                className={`p-5 rounded-2xl border cursor-pointer transition shadow-2xs ${
                  feeFilter === "week"
                    ? "bg-sky-600 text-white border-sky-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-sky-400"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-75">
                  Expected This Week
                </span>
                <p className="text-2xl font-black mt-2">
                  ₹{sumExpected(dueWeekList).toLocaleString("en-IN")}
                </p>
                <span className="text-xs opacity-75 mt-1 block">
                  {dueWeekList.length} Students next 7 days
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("month")}
                className={`p-5 rounded-2xl border cursor-pointer transition shadow-2xs ${
                  feeFilter === "month"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-indigo-400"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-75">
                  Expected This Month
                </span>
                <p className="text-2xl font-black mt-2">
                  ₹{sumExpected(dueMonthList).toLocaleString("en-IN")}
                </p>
                <span className="text-xs opacity-75 mt-1 block">
                  {dueMonthList.length} Students in {currentYearMonth}
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("overdue")}
                className={`p-5 rounded-2xl border cursor-pointer transition shadow-2xs ${
                  feeFilter === "overdue"
                    ? "bg-rose-600 text-white border-rose-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-rose-400"
                }`}
              >
                <span className="text-xs font-bold uppercase opacity-75">
                  Overdue Promises
                </span>
                <p className="text-2xl font-black mt-2">
                  ₹{sumExpected(overdueList).toLocaleString("en-IN")}
                </p>
                <span className="text-xs opacity-75 mt-1 block">
                  {overdueList.length} Missed promised date
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Fee Follow-up Queue ({displayedFeeStudents.length} Students)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any student row to set/update their Next Expected Installment Date, E-Mandate status, or upload a fee follow-up call.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                      <th className="py-3 px-4">ID & Name</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Total Remaining</th>
                      <th className="py-3 px-4">Promised Amount</th>
                      <th className="py-3 px-4">Promised Date</th>
                      <th className="py-3 px-4">E-Mandate</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedFeeStudents.slice(0, 100).map((s) => {
                      const rem = (s.total_fees || 0) - (s.fee_paid_till_date || 0);
                      return (
                        <tr
                          key={s.student_id}
                          onClick={() => openStudentProfile(s)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs text-sky-700 font-bold mr-2 bg-sky-50 px-2 py-1 rounded border border-sky-100">
                              {s.student_id}
                            </span>
                            <span className="font-bold capitalize text-slate-900">{s.full_name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{s.batch_class}</td>
                          <td className="py-3.5 px-4 font-extrabold text-rose-600">
                            ₹{rem.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">
                            {s.next_installment_amount
                              ? `₹${s.next_installment_amount.toLocaleString("en-IN")}`
                              : "-"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {s.next_installment_date || "Not Scheduled"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                                s.e_mandate_status === "Done"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {s.e_mandate_status || "Pending"}
                            </span>
                          </td>
                          <td
                            className="py-3.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.contact_number && (
                              <button
                                onClick={() => {
                                  const msg = `Namaste from Pioneer Academy, Bikaner. Gentle reminder regarding the pending fee installment of ₹${
                                    s.next_installment_amount || rem
                                  } for ${s.full_name} (${s.student_id}).`;
                                  window.open(
                                    `https://wa.me/91${s.contact_number?.toLowerCase() || "N/A"}
                                      -10
                                    )}?text=${encodeURIComponent(msg)}`,
                                    "_blank"
                                  );
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                              >
                                <Send className="w-3.5 h-3.5" /> WA Reminder
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "leads" && currentRole !== "TEACHER" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <form
                onSubmit={handleCreateLead}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
              >
                <h2 className="font-bold text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-900">
                  <UserPlus className="w-5 h-5 text-sky-600" />
                  Create New Admission Lead
                </h2>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="e.g. Rahul Bishnoi"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={newLeadFather}
                      onChange={(e) => setNewLeadFather(e.target.value)}
                      placeholder="Father Name"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newLeadMobile}
                      onChange={(e) => setNewLeadMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Class
                    </label>
                    <select
                      value={newLeadClass}
                      onChange={(e) => setNewLeadClass(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-2.5 text-xs bg-slate-50 font-semibold outline-none"
                    >
                      <option>10th</option>
                      <option>Class XI</option>
                      <option>Class XII</option>
                      <option>Repeater</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Board
                    </label>
                    <select
                      value={newLeadBoard}
                      onChange={(e) => setNewLeadBoard(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-2.5 text-xs bg-slate-50 font-semibold outline-none"
                    >
                      <option>CBSE</option>
                      <option>RBSE</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Medium
                    </label>
                    <select
                      value={newLeadMedium}
                      onChange={(e) => setNewLeadMedium(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2.5 py-2.5 text-xs bg-slate-50 font-semibold outline-none"
                    >
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Quoted Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={newLeadQuotedFee}
                      onChange={(e) => setNewLeadQuotedFee(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Counsellor
                    </label>
                    <input
                      type="text"
                      value={newLeadCounsellor}
                      onChange={(e) => setNewLeadCounsellor(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer shadow-md transition"
                >
                  + Add Lead to Pipeline
                </button>
              </form>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Bulk Upload Leads via CSV
                </h3>
                <p className="text-xs text-slate-500">
                  CSV columns: <code>Student Name, Mobile, Father Name, Class, Board, Medium</code>
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleBulkLeadCsv(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Active Sales Leads Pipeline ({leads.length}) — Click Any Lead for Timeline & AI Calling
              </h2>
              {leads.length === 0 ? (
                <p className="text-sm text-slate-400 py-16 text-center">
                  No sales leads added yet. Add a lead on the left or upload a CSV.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                        <th className="py-3 px-4">Student & Father</th>
                        <th className="py-3 px-4">Mobile</th>
                        <th className="py-3 px-4">Class / Board / Med</th>
                        <th className="py-3 px-4">Quoted Fee</th>
                        <th className="py-3 px-4">Counsellor</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((ld) => (
                        <tr
                          key={ld.id}
                          onClick={() => openLeadProfile(ld)}
                          className="hover:bg-amber-50/60 cursor-pointer transition"
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-bold capitalize text-slate-900">
                              {ld.student_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              F: {ld.father_name || "-"}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                            {ld.mobile_number}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium">
                            <b>{ld.batch_class}</b> • {ld.board} ({ld.medium})
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            ₹{(ld.quoted_fee || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{ld.assigned_counsellor}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
                              {ld.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {(activeStudentModal || activeLeadModal) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono bg-sky-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold shadow-2xs">
                    {activeStudentModal ? activeStudentModal.student_id : "SALES LEAD"}
                  </span>
                  <h2 className="text-lg font-bold capitalize">
                    {activeStudentModal
                      ? activeStudentModal.full_name
                      : activeLeadModal?.student_name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeStudentModal
                    ? `Batch: ${activeStudentModal.batch_class} • Father: ${
                        activeStudentModal.father_name || "-"
                      } • Ph: ${activeStudentModal.contact_number || "N/A"}`
                    : `Class: ${activeLeadModal?.batch_class} (${activeLeadModal?.board} - ${activeLeadModal?.medium}) • Father: ${
                        activeLeadModal?.father_name || "-"
                      } • Ph: ${activeLeadModal?.mobile_number}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveStudentModal(null);
                  setActiveLeadModal(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="lg:col-span-5 p-6 space-y-5 overflow-y-auto">
                {activeStudentModal && (
                  <>
                    {currentRole !== "TEACHER" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            Fee Schedule & E-Mandate
                          </h3>
                          <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                            Pending: ₹
                            {(
                              (activeStudentModal.total_fees || 0) - modalFeePaid
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Fee Paid Till Date (₹)
                            </label>
                            <input
                              type="number"
                              value={modalFeePaid}
                              onChange={(e) => setModalFeePaid(Number(e.target.value))}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              E-Mandate Status
                            </label>
                            <select
                              value={modalEMandate}
                              onChange={(e) => setModalEMandate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold outline-none"
                            >
                              <option value="Pending">⏳ Pending</option>
                              <option value="Done">✅ E-Mandate Done</option>
                              <option value="Failed">❌ Failed / Rejected</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Next Expected Fee (₹)
                            </label>
                            <input
                              type="number"
                              value={modalNextFeeAmount}
                              onChange={(e) => setModalNextFeeAmount(Number(e.target.value))}
                              placeholder="e.g. 10000"
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none font-semibold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Expected Date
                            </label>
                            <input
                              type="date"
                              value={modalNextFeeDate}
                              onChange={(e) => setModalNextFeeDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                          Academic Category
                        </label>
                        <select
                          value={modalAcademicTag}
                          onChange={(e) => setModalAcademicTag(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white font-bold outline-none"
                        >
                          <option value="Topper / Ranker">Topper / Ranker 🏆</option>
                          <option value="Good Student">Good Student 👍</option>
                          <option value="Needs Effort">Needs Effort ⚠️</option>
                          <option value="Average / Mediocre">Average / Mediocre 📊</option>
                          <option value="Weak Student">Weak Student 🔴</option>
                          <option value="Extremely Weak Student">Extremely Weak 🚨</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                          Risk / Account Flag
                        </label>
                        <select
                          value={modalRisk}
                          onChange={(e) => setModalRisk(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white font-bold outline-none"
                        >
                          <option value="Active">Active (Normal)</option>
                          <option value="High Risk">High Risk 🔴</option>
                          <option value="Have Left Already">Have Left Already</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeLeadModal && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase text-amber-900">
                      Lead Stage
                    </label>
                    <select
                      value={modalLeadStatus}
                      onChange={(e) => setModalLeadStatus(e.target.value)}
                      className="w-full border border-amber-300 rounded-xl p-2.5 text-xs bg-white font-bold outline-none"
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Demo Booked</option>
                      <option>Demo Attended</option>
                      <option>Fee Discussion</option>
                      <option>Lost</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveLeadModal(false)}
                        className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
                      >
                        Update Stage
                      </button>
                      <button
                        onClick={() => handleSaveLeadModal(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
                      >
                        🎓 Convert to Student
                      </button>
                    </div>
                  </div>
                )}

                {currentRole !== "TEACHER" && (
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <h3 className="text-xs font-bold uppercase text-sky-950 flex items-center gap-1.5">
                      <FileAudio className="w-4 h-4 text-sky-600" />
                      AI Call Recording Analyzer (Gemini Flash)
                    </h3>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioFileSelect(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white cursor-pointer"
                    />
                    {modalAudioFile && (
                      <button
                        type="button"
                        onClick={handleAnalyzeCallWithAI}
                        disabled={analyzingCall}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 shadow-sm transition"
                      >
                        {analyzingCall
                          ? "🎙️ Transcribing & Extracting Actionables..."
                          : `✨ Transcribe & Summarize Call (${modalAudioDuration}s)`}
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Add New {currentRole === "TEACHER" ? "Teacher Remark" : "Follow-up Comment"}
                  </label>
                  <textarea
                    rows={2}
                    value={modalNoteText}
                    onChange={(e) => setModalNoteText(e.target.value)}
                    placeholder="Type observation, fee discussion, or PTM note..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs bg-white outline-none"
                  />
                  <button
                    onClick={handleSaveStudentModal}
                    disabled={savingModal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs cursor-pointer shadow-md transition"
                  >
                    {savingModal ? "Saving..." : "💾 Save Profile, Fee, Tags & Post to Timeline"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 p-6 bg-slate-50/60 overflow-y-auto">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600" />
                    Chronological Activity & Call Timeline ({modalTimeline.length})
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Newest entries first
                  </span>
                </h3>

                {activeStudentModal?.general_remarks && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <span className="font-bold text-amber-900 block mb-1">
                      📌 Legacy Sheet Remark:
                    </span>
                    <p className="text-amber-800 leading-relaxed">{activeStudentModal.general_remarks}</p>
                  </div>
                )}

                {loadingTimeline ? (
                  <p className="text-xs text-slate-400 py-16 text-center">
                    Loading timeline history...
                  </p>
                ) : modalTimeline.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No timeline entries logged yet. Update profile or post a comment below!
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {modalTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`font-bold px-2.5 py-1 rounded-lg border ${
                                item.entry_type === "CALL_AI"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : item.entry_type === "TEACHER_REMARK"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : item.entry_type === "FEE_PROMISE"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-800 border-slate-200"
                              }`}
                            >
                              {item.entry_type === "CALL_AI"
                                ? "🎙️ AI Call Summary"
                                : item.entry_type === "TEACHER_REMARK"
                                ? "👨‍🏫 Teacher Remark"
                                : item.entry_type === "FEE_PROMISE"
                                ? "💰 Fee Schedule"
                                : "💬 Counsellor Note"}
                            </span>
                            <span className="font-bold text-slate-700">
                              {item.author_name}
                            </span>
                            {item.call_duration_seconds && (
                              <span className="text-slate-500 font-mono">
                                ({Math.floor(item.call_duration_seconds / 60)}m{" "}
                                {item.call_duration_seconds % 60}s)
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px] font-medium">
                            {new Date(item.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                          {item.summary}
                        </p>

                        {item.action_items && (
                          <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs text-amber-900 leading-relaxed">
                            <b>⚡ Actionable:</b> {item.action_items}
                          </div>
                        )}

                        {item.transcript && (
                          <details className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <summary className="font-bold cursor-pointer text-sky-700">
                              View Full Call Transcript
                            </summary>
                            <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-700">
                              {item.transcript}
                            </p>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}