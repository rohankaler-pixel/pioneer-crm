"use client";
import AuthGate, { CrmUser } from "@/components/AuthGate";
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
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Edit3,
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
  return (
    <AuthGate>
      {(user, logout) => <PioneerCRMMain user={user} logout={logout} />}
    </AuthGate>
  );
}

function PioneerCRMMain({ user, logout }: { user: CrmUser; logout: () => void }) {
  const currentRole: Role = user.role;
  const currentUserName: string = user.full_name;

  const [activeTab, setActiveTab] = useState<
    "attendance" | "assignments" | "tests" | "directory" | "fees" | "leads"
  >("attendance");

  const [showMobilePulse, setShowMobilePulse] = useState(false);

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

  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [recentTests, setRecentTests] = useState<any[]>([]);

  const [activeStudentModal, setActiveStudentModal] = useState<Student | null>(null);
  const [activeLeadModal, setActiveLeadModal] = useState<Lead | null>(null);
  const [modalTimeline, setModalTimeline] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [editFullName, setEditFullName] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editBatchClass, setEditBatchClass] = useState("");
  const [editStream, setEditStream] = useState("");
  const [editBoard, setEditBoard] = useState("CBSE");
  const [editMedium, setEditMedium] = useState("English");
  const [editContactNumber, setEditContactNumber] = useState("");
  const [editParentAltNumber, setEditParentAltNumber] = useState("");
  const [editTotalFees, setEditTotalFees] = useState(0);

  const [modalRisk, setModalRisk] = useState("Active");
  const [modalAcademicTag, setModalAcademicTag] = useState("Good Student");
  const [modalEMandate, setModalEMandate] = useState("Pending");
  const [modalFeePaid, setModalFeePaid] = useState(0);
  const [modalNextFeeAmount, setModalNextFeeAmount] = useState(0);
  const [modalNextFeeDate, setModalNextFeeDate] = useState("");
  const [modalNoteText, setModalNoteText] = useState("");
  const [modalLeadStatus, setModalLeadStatus] = useState("New");

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStId, setNewStId] = useState("");
  const [newStName, setNewStName] = useState("");
  const [newStFather, setNewStFather] = useState("");
  const [newStBatch, setNewStBatch] = useState("Class XI");
  const [newStStream, setNewStStream] = useState("JEE / NEET");
  const [newStBoard, setNewStBoard] = useState("CBSE");
  const [newStMedium, setNewStMedium] = useState("English");
  const [newStPhone, setNewStPhone] = useState("");
  const [newStAltPhone, setNewStAltPhone] = useState("");
  const [newStTotalFee, setNewStTotalFee] = useState(45000);
  const [newStPaidFee, setNewStPaidFee] = useState(0);
  const [newStRemarks, setNewStRemarks] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);

  const [modalAudioFile, setModalAudioFile] = useState<File | null>(null);
  const [modalAudioDuration, setModalAudioDuration] = useState(0);
  const [analyzingCall, setAnalyzingCall] = useState(false);

  const [savingModal, setSavingModal] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [assignmentMode, setAssignmentMode] = useState<"class" | "individual">("class");
  const [targetBatchForHw, setTargetBatchForHw] = useState("Class XI");
  const [selectedStudentForHw, setSelectedStudentForHw] = useState("");
  const [hwSubject, setHwSubject] = useState("Physics");
  const [hwTopic, setHwTopic] = useState("");
  const [hwGiven, setHwGiven] = useState(10);
  const [hwCompleted, setHwCompleted] = useState(10);
  const [hwRemarks, setHwRemarks] = useState("");

  const [testStudentId, setTestStudentId] = useState("");
  const [testCode, setTestCode] = useState("UNIT-01");
  const [testDate, setTestDate] = useState("");
  const [marksObtained, setMarksObtained] = useState(65);
  const [maxMarks, setMaxMarks] = useState(100);
  const [batchRank, setBatchRank] = useState("5");
  const [testType, setTestType] = useState("Subjective");
  const [testTeacherComments, setTestTeacherComments] = useState("");
  const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadFather, setNewLeadFather] = useState("");
  const [newLeadMobile, setNewLeadMobile] = useState("");
  const [newLeadClass, setNewLeadClass] = useState("Class XI");
  const [newLeadBoard, setNewLeadBoard] = useState("CBSE");
  const [newLeadMedium, setNewLeadMedium] = useState("English");
  const [newLeadQuotedFee, setNewLeadQuotedFee] = useState(45000);
  const [newLeadCounsellor, setNewLeadCounsellor] = useState(
    user.full_name.split(" ")[0] || "Komal"
  );

  const [feeFilter, setFeeFilter] = useState<
    "all_due" | "today" | "week" | "month" | "overdue"
  >("all_due");

  const uniqueBatches = [
    "All",
    ...Array.from(
      new Set([
        "8th",
        "9th",
        "10th",
        "Class XI",
        "Class XII",
        "Repeater",
        ...students.map((s) => s.batch_class).filter(Boolean),
      ])
    ),
  ];

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    setTestDate(today);
    fetchData(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchData(selectedDate);
    }
  }, [selectedDate]);

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

    setEditFullName(st.full_name || "");
    setEditFatherName(st.father_name || "");
    setEditBatchClass(st.batch_class || "Class XI");
    setEditStream(st.stream || "");
    setEditBoard(st.board || "CBSE");
    setEditMedium(st.medium || "English");
    setEditContactNumber(st.contact_number || "");
    setEditParentAltNumber(st.parent_alt_number || "");
    setEditTotalFees(st.total_fees || 0);

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

  const openAddStudentModal = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setNewStId(`ADM26-${randomNum}`);
    setNewStName("");
    setNewStFather("");
    setNewStBatch("Class XI");
    setNewStStream("JEE / NEET");
    setNewStBoard("CBSE");
    setNewStMedium("English");
    setNewStPhone("");
    setNewStAltPhone("");
    setNewStTotalFee(45000);
    setNewStPaidFee(0);
    setNewStRemarks("");
    setShowAddStudentModal(true);
  };

  const handleCreateEnrolledStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStName.trim() || !newStId.trim()) {
      return alert("Student ID and Full Name are required.");
    }
    setCreatingStudent(true);

    const payload = {
      student_id: newStId.trim().toUpperCase(),
      full_name: newStName.trim(),
      father_name: newStFather.trim() || null,
      batch_class: newStBatch.trim(),
      stream: newStStream.trim() || null,
      board: newStBoard,
      medium: newStMedium,
      contact_number: newStPhone.trim() || null,
      parent_alt_number: newStAltPhone.trim() || null,
      total_fees: Number(newStTotalFee) || 0,
      fee_paid_till_date: Number(newStPaidFee) || 0,
      risk_category: "Active",
      academic_tag: "Good Student",
      e_mandate_status: "Pending",
      general_remarks: newStRemarks.trim() || null,
    };

    const { error } = await supabase.from("students").insert(payload);

    if (error) {
      alert("Error adding student: " + error.message);
      setCreatingStudent(false);
      return;
    }

    await supabase.from("activity_timeline").insert({
      student_id: payload.student_id,
      entry_type: "COUNSELLOR_NOTE",
      author_name: currentUserName,
      author_role: currentRole,
      summary: `New student enrolled in ${payload.batch_class}. Total Fees: ₹${payload.total_fees.toLocaleString(
        "en-IN"
      )}, Paid: ₹${payload.fee_paid_till_date.toLocaleString("en-IN")}.`,
    });

    setCreatingStudent(false);
    setShowAddStudentModal(false);
    alert(`Student ${payload.full_name} (${payload.student_id}) enrolled!`);
    fetchData(selectedDate);
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
        const summaryText = `[AI Checked] ${ai.work_summary || ""} | Strong: ${
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
    if (!editFullName.trim()) return alert("Student name cannot be empty.");
    setSavingModal(true);

    const updatePayload: any = {
      full_name: editFullName.trim(),
      father_name: editFatherName.trim() || null,
      batch_class: editBatchClass.trim(),
      stream: editStream.trim() || null,
      board: editBoard,
      medium: editMedium,
      contact_number: editContactNumber.trim() || null,
      parent_alt_number: editParentAltNumber.trim() || null,
      total_fees: Number(editTotalFees) || 0,
      risk_category: modalRisk,
      academic_tag: modalAcademicTag,
      e_mandate_status: modalEMandate,
      fee_paid_till_date: Number(modalFeePaid) || 0,
      next_installment_amount: Number(modalNextFeeAmount) || 0,
      next_installment_date: modalNextFeeDate || null,
    };

    const { error } = await supabase
      .from("students")
      .update(updatePayload)
      .eq("student_id", activeStudentModal.student_id);

    if (error) {
      alert("Error saving student: " + error.message);
      setSavingModal(false);
      return;
    }

    const timelineInserts: any[] = [];
    const author = currentUserName;
    const role = currentRole;

    const coreChanges: string[] = [];
    if (editFullName.trim() !== (activeStudentModal.full_name || "")) {
      coreChanges.push(`Name -> ${editFullName.trim()}`);
    }
    if (editFatherName.trim() !== (activeStudentModal.father_name || "")) {
      coreChanges.push(`Father -> ${editFatherName.trim() || "None"}`);
    }
    if (editBatchClass.trim() !== (activeStudentModal.batch_class || "")) {
      coreChanges.push(`Batch -> ${editBatchClass.trim()}`);
    }
    if (editContactNumber.trim() !== (activeStudentModal.contact_number || "")) {
      coreChanges.push(`Mobile -> ${editContactNumber.trim() || "None"}`);
    }
    if (Number(editTotalFees) !== Number(activeStudentModal.total_fees || 0)) {
      coreChanges.push(
        `Total Fee -> ₹${Number(editTotalFees).toLocaleString("en-IN")}`
      );
    }

    if (coreChanges.length > 0) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "COUNSELLOR_NOTE",
        author_name: author,
        author_role: role,
        summary: `Student profile details updated: ${coreChanges.join(", ")}`,
      });
    }

    if (modalFeePaid !== (activeStudentModal.fee_paid_till_date || 0)) {
      timelineInserts.push({
        student_id: activeStudentModal.student_id,
        entry_type: "FEE_PROMISE",
        author_name: author,
        author_role: role,
        summary: `Fee paid updated to ₹${modalFeePaid.toLocaleString(
          "en-IN"
        )} (Total Fee: ₹${Number(editTotalFees || 0).toLocaleString("en-IN")})`,
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
    alert("Student details, fee schedule & timeline updated!");
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

        alert(`Lead converted to Enrolled Student (${newStudentId})!`);
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
      (s.batch_class &&
        s.batch_class.toLowerCase().trim() === selectedBatch.toLowerCase().trim());
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.full_name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      (s.father_name && s.father_name.toLowerCase().includes(q)) ||
      (s.contact_number && s.contact_number.includes(q));
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

    window.open(
      `https://wa.me/91${phoneToUse.slice(-10)}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

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
    if (!newLeadName || !newLeadMobile)
      return alert("Student Name and Mobile are required.");

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
    if (lines.length < 2)
      return alert("CSV must have a header row and at least 1 lead.");

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rowsToInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || "";
      });

      const name = rowObj["student name"] || rowObj["name"] || cols[0];
      const mobile =
        rowObj["mobile"] || rowObj["mobile number"] || rowObj["phone"] || cols[1];
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

    if (rowsToInsert.length === 0)
      return alert("Could not parse valid rows from CSV.");
    const { error } = await supabase.from("leads").insert(rowsToInsert);
    if (error) alert("Bulk upload error: " + error.message);
    else {
      alert(`Successfully uploaded ${rowsToInsert.length} leads!`);
      fetchData(selectedDate);
    }
  };

  const todayStr = selectedDate || "2026-10-21";
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-black text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.jpg"
                alt="Pioneer Academy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                className="h-8 sm:h-10 w-auto object-contain rounded-md bg-white p-0.5 shrink-0"
              />
              <div className="truncate">
                <h1 className="font-bold text-xs sm:text-base tracking-wide text-sky-400 leading-tight truncate">
                  PIONEER ACADEMY, BIKANER
                </h1>
                <p className="text-[10px] sm:text-[11px] text-yellow-400 font-medium truncate">
                  {currentUserName} • {currentRole}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMobilePulse(!showMobilePulse)}
                className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sky-400 text-[11px] font-semibold"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Pulse
                {showMobilePulse ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-yellow-400 uppercase">
                  {currentRole}
                </span>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 cursor-pointer transition text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto no-scrollbar bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "attendance"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              1. Attendance
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "assignments"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              2. Assignments
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "tests"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              3. Tests & AI
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "directory"
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              4. Students ({students.length})
            </button>

            {currentRole !== "TEACHER" && (
              <>
                <button
                  onClick={() => setActiveTab("fees")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "fees"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-emerald-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                  5. Fees
                </button>
                <button
                  onClick={() => setActiveTab("leads")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "leads"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-amber-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  6. Leads ({leads.length})
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className={`${
            showMobilePulse ? "block" : "hidden md:block"
          } bg-slate-900 text-slate-200 border-t border-slate-800 py-2 px-4 shadow-inner`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <BarChart3 className="w-3.5 h-3.5" /> Live Pulse:
              </span>
              <span>
                Enrolled: <b className="text-white">{students.length}</b>
              </span>
              <span>
                Present: <b className="text-emerald-400">{presentCount}</b>
              </span>
              <span>
                Absent: <b className="text-rose-400">{absentStudents.length}</b>
              </span>
              {currentRole !== "TEACHER" && (
                <>
                  <span className="text-emerald-400">
                    Due Today:{" "}
                    <b>₹{sumExpected(dueTodayList).toLocaleString("en-IN")}</b>
                  </span>
                  <span className="text-amber-300">
                    Leads: <b>{leads.length}</b>
                  </span>
                </>
              )}
            </div>
            <div className="hidden lg:block text-[11px] text-slate-400">
              Click any Student or Lead to edit details & open their{" "}
              <b>360° Timeline</b>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {dbError && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
            ⚠️ {dbError}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Batch
                    </label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white outline-none"
                    >
                      {uniqueBatches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Name, Father or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-48 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || filteredStudents.length === 0}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  {savingAttendance ? "Saving..." : "Save Attendance"}
                </button>
              </div>

              {saveSuccess && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Attendance saved for {selectedBatch} ({selectedDate})!
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 my-4 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                  Total: <b className="text-slate-900">{filteredStudents.length}</b>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                  Present: <b>{presentCount}</b>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 font-semibold border border-rose-100">
                  Absent: <b>{absentStudents.length}</b>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                  Leave: <b>{leaveCount}</b>
                </span>
              </div>

              {loading ? (
                <p className="py-16 text-center text-slate-400 text-sm">
                  Loading students...
                </p>
              ) : (
                <div className="overflow-y-auto max-h-[550px] divide-y divide-slate-100 pr-1">
                  {filteredStudents.map((student) => {
                    const current =
                      attendanceMap[student.student_id]?.status || "Present";
                    return (
                      <div
                        key={student.student_id}
                        className={`py-3 px-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl transition ${
                          current === "Absent"
                            ? "bg-rose-50/70 border border-rose-100 my-1"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200">
                              {student.student_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => openStudentProfile(student)}
                              className="font-bold text-slate-900 capitalize cursor-pointer hover:text-sky-600 hover:underline text-left text-sm flex items-center gap-1"
                            >
                              {student.full_name}
                              <Edit3 className="w-3 h-3 text-slate-400 inline" />
                            </button>
                            <span className="text-[11px] bg-sky-50 text-sky-700 font-medium px-2 py-0.5 rounded-md border border-sky-100">
                              {student.academic_tag || "Good Student"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {student.batch_class} • F: {student.father_name || "-"} • Ph:{" "}
                            {student.contact_number || "N/A"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {(["Present", "Absent", "Leave"] as AttendanceStatus[]).map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatus(student.student_id, st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 h-fit lg:sticky lg:top-28">
              <h2 className="font-bold text-base flex items-center gap-2 text-rose-700 pb-3 border-b border-slate-100">
                <AlertCircle className="w-5 h-5" />
                Absentee WhatsApp Queue ({absentStudents.length})
              </h2>
              {absentStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No students marked Absent in {selectedBatch} for {selectedDate}.
                </div>
              ) : (
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {absentStudents.map((st) => {
                    const notified =
                      attendanceMap[st.student_id]?.whatsapp_notified;
                    return (
                      <div
                        key={st.student_id}
                        className={`p-3.5 rounded-xl border ${
                          notified
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-rose-50/40 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm capitalize text-slate-900">
                            {st.full_name}
                          </span>
                          <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border">
                            {st.student_id}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {st.contact_number && (
                            <button
                              onClick={() =>
                                sendAbsentWhatsApp(st, st.contact_number)
                              }
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              WA ({st.contact_number})
                            </button>
                          )}
                          {st.parent_alt_number && (
                            <button
                              onClick={() =>
                                sendAbsentWhatsApp(st, st.parent_alt_number)
                              }
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Alt ({st.parent_alt_number})
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
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4 h-fit"
            >
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 text-slate-900">
                Log Homework / Assignment
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAssignmentMode("class")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    assignmentMode === "class"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Complete Batch / Class
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode("individual")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    assignmentMode === "individual"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 font-medium outline-none"
                  >
                    {uniqueBatches
                      .filter((b) => b !== "All")
                      .map((b) => (
                        <option key={b} value={b}>
                          {b} ({students.filter((s) => s.batch_class === b).length}{" "}
                          Students)
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
                  >
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                    <option>Science</option>
                    <option>English</option>
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Teacher&apos;s Remarks
                </label>
                <textarea
                  rows={2}
                  value={hwRemarks}
                  onChange={(e) => setHwRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer shadow-md transition"
              >
                Save Assignment Record
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Recent Homework & Assignment Logs
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentAssignments.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm capitalize text-slate-900">
                          {log.students?.full_name}
                        </span>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-md border text-slate-700 font-semibold">
                          {log.student_id}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {log.subject}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        <b>Topic:</b> {log.topic_name} •{" "}
                        <b>
                          Completed: {log.assignments_completed}/
                          {log.assignments_given}
                        </b>
                      </p>
                      {log.teacher_remarks && (
                        <p className="text-xs text-slate-700 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          &ldquo;{log.teacher_remarks}&rdquo;
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
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4 h-fit"
            >
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-900">
                <Award className="w-5 h-5 text-amber-600" />
                Upload Test Score & AI Answer Checker
              </h2>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI Answer Sheet Checker (Gemini Vision)
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Upload a photo/PDF of a student&apos;s subjective answer sheet to
                  auto-grade and generate a PTM work summary.
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setAnswerSheetFile(e.target.files?.[0] || null)
                  }
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
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none"
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50 outline-none"
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
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs bg-slate-50 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm cursor-pointer shadow-md transition"
              >
                Save Score & PTM Summary
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Recent Test Scores & AI Evaluations ({recentTests.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentTests.map((t) => {
                  const pct = Math.round(
                    (t.marks_obtained / Math.max(t.max_marks, 1)) * 100
                  );
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm capitalize text-slate-900">
                            {t.students?.full_name}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-md border text-slate-700 font-semibold">
                            {t.student_id}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Enrolled Student Master ({filteredStudents.length} Students)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any student row to edit Name, Father&apos;s Name, Mobile,
                  Batch, Fees, or log AI Calls.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50 font-medium outline-none"
                >
                  {uniqueBatches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search name, father, mobile, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 sm:w-56 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 outline-none"
                />
                {currentRole !== "TEACHER" && (
                  <button
                    type="button"
                    onClick={openAddStudentModal}
                    className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" /> Add New Student
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 bg-slate-50">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Student & Father</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Mobile</th>
                    <th className="py-3 px-3">Academic Tag</th>
                    {currentRole !== "TEACHER" && (
                      <>
                        <th className="py-3 px-3">Fee Paid / Total</th>
                        <th className="py-3 px-3">Next Due</th>
                      </>
                    )}
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.slice(0, 200).map((s) => (
                    <tr
                      key={s.student_id}
                      onClick={() => openStudentProfile(s)}
                      className="hover:bg-sky-50/70 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 font-mono text-xs font-bold text-sky-700 whitespace-nowrap">
                        {s.student_id}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold capitalize text-slate-900">
                          {s.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          F: {s.father_name || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {s.batch_class}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {s.contact_number || "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border whitespace-nowrap">
                          {s.academic_tag || "Good Student"}
                        </span>
                      </td>
                      {currentRole !== "TEACHER" && (
                        <>
                          <td className="py-3 px-3 text-xs font-medium whitespace-nowrap">
                            <b className="text-emerald-700">
                              ₹{(s.fee_paid_till_date || 0).toLocaleString("en-IN")}
                            </b>{" "}
                            / ₹{(s.total_fees || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap">
                            {s.next_installment_date
                              ? `${s.next_installment_date} (₹${(
                                  s.next_installment_amount || 0
                                ).toLocaleString("en-IN")})`
                              : "-"}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800">
                          <Edit3 className="w-3.5 h-3.5" /> Edit
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div
                onClick={() => setFeeFilter("all_due")}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
                  feeFilter === "all_due"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className="text-[11px] font-bold uppercase opacity-75">
                  Total Pending Fees
                </span>
                <p className="text-lg sm:text-2xl font-black mt-1.5">
                  ₹{totalPendingFeeSum.toLocaleString("en-IN")}
                </p>
                <span className="text-[11px] opacity-75 mt-1 block">
                  {studentsWithBalance.length} Students
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("today")}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
                  feeFilter === "today"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-emerald-400"
                }`}
              >
                <span className="text-[11px] font-bold uppercase opacity-75">
                  Expected Today
                </span>
                <p className="text-lg sm:text-2xl font-black mt-1.5">
                  ₹{sumExpected(dueTodayList).toLocaleString("en-IN")}
                </p>
                <span className="text-[11px] opacity-75 mt-1 block">
                  {dueTodayList.length} Students
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("week")}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
                  feeFilter === "week"
                    ? "bg-sky-600 text-white border-sky-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-sky-400"
                }`}
              >
                <span className="text-[11px] font-bold uppercase opacity-75">
                  This Week
                </span>
                <p className="text-lg sm:text-2xl font-black mt-1.5">
                  ₹{sumExpected(dueWeekList).toLocaleString("en-IN")}
                </p>
                <span className="text-[11px] opacity-75 mt-1 block">
                  {dueWeekList.length} Students
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("month")}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
                  feeFilter === "month"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-indigo-400"
                }`}
              >
                <span className="text-[11px] font-bold uppercase opacity-75">
                  This Month
                </span>
                <p className="text-lg sm:text-2xl font-black mt-1.5">
                  ₹{sumExpected(dueMonthList).toLocaleString("en-IN")}
                </p>
                <span className="text-[11px] opacity-75 mt-1 block">
                  {dueMonthList.length} Students
                </span>
              </div>

              <div
                onClick={() => setFeeFilter("overdue")}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition col-span-2 sm:col-span-1 ${
                  feeFilter === "overdue"
                    ? "bg-rose-600 text-white border-rose-600 shadow-md"
                    : "bg-white border-slate-200 hover:border-rose-400"
                }`}
              >
                <span className="text-[11px] font-bold uppercase opacity-75">
                  Overdue Promises
                </span>
                <p className="text-lg sm:text-2xl font-black mt-1.5">
                  ₹{sumExpected(overdueList).toLocaleString("en-IN")}
                </p>
                <span className="text-[11px] opacity-75 mt-1 block">
                  {overdueList.length} Missed date
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Fee Follow-up Queue ({displayedFeeStudents.length} Students)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any student row to update Total Fee, Fee Paid, Next
                    Installment Date, or E-Mandate.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 bg-slate-50">
                      <th className="py-3 px-3">ID & Name</th>
                      <th className="py-3 px-3">Batch</th>
                      <th className="py-3 px-3">Remaining</th>
                      <th className="py-3 px-3">Promised</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">E-Mandate</th>
                      <th className="py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedFeeStudents.slice(0, 100).map((s) => {
                      const rem =
                        (s.total_fees || 0) - (s.fee_paid_till_date || 0);
                      return (
                        <tr
                          key={s.student_id}
                          onClick={() => openStudentProfile(s)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs text-sky-700 font-bold mr-2 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                              {s.student_id}
                            </span>
                            <span className="font-bold capitalize text-slate-900">
                              {s.full_name}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">
                            {s.batch_class}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-rose-600">
                            ₹{rem.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-700">
                            {s.next_installment_amount
                              ? `₹${s.next_installment_amount.toLocaleString("en-IN")}`
                              : "-"}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {s.next_installment_date || "Not Scheduled"}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                s.e_mandate_status === "Done"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {s.e_mandate_status || "Pending"}
                            </span>
                          </td>
                          <td
                            className="py-3 px-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.contact_number && (
                              <button
                                onClick={() => {
                                  const msg = `Namaste from Pioneer Academy, Bikaner. Gentle reminder regarding the pending fee installment of ₹${
                                    s.next_installment_amount || rem
                                  } for ${s.full_name} (${s.student_id}).`;
                                  window.open(
                                    `https://wa.me/91${s.contact_number?.slice(
                                      -10
                                    )}?text=${encodeURIComponent(msg)}`,
                                    "_blank"
                                  );
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" /> WA
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
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4"
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
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Father&apos;s Name
                    </label>
                    <input
                      type="text"
                      value={newLeadFather}
                      onChange={(e) => setNewLeadFather(e.target.value)}
                      placeholder="Father Name"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                      <option>8th</option>
                      <option>9th</option>
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
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 outline-none"
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

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Bulk Upload Leads via CSV
                </h3>
                <p className="text-xs text-slate-500">
                  CSV columns:{" "}
                  <code>Student Name, Mobile, Father Name, Class, Board, Medium</code>
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleBulkLeadCsv(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="font-bold text-base border-b border-slate-100 pb-3 mb-4 text-slate-900">
                Active Sales Leads Pipeline ({leads.length})
              </h2>
              {leads.length === 0 ? (
                <p className="text-sm text-slate-400 py-16 text-center">
                  No sales leads added yet. Add a lead on the left or upload a CSV.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 bg-slate-50">
                        <th className="py-3 px-3">Student & Father</th>
                        <th className="py-3 px-3">Mobile</th>
                        <th className="py-3 px-3">Class / Board</th>
                        <th className="py-3 px-3">Quoted Fee</th>
                        <th className="py-3 px-3">Counsellor</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((ld) => (
                        <tr
                          key={ld.id}
                          onClick={() => openLeadProfile(ld)}
                          className="hover:bg-amber-50/60 cursor-pointer transition"
                        >
                          <td className="py-3 px-3">
                            <p className="font-bold capitalize text-slate-900">
                              {ld.student_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              F: {ld.father_name || "-"}
                            </p>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700">
                            {ld.mobile_number}
                          </td>
                          <td className="py-3 px-3 text-xs font-medium">
                            <b>{ld.batch_class}</b> • {ld.board} ({ld.medium})
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            ₹{(ld.quoted_fee || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-xs font-medium text-slate-700">
                            {ld.assigned_counsellor}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
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

      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-sky-400" />
                  Add New Enrolled Student
                </h2>
                <p className="text-xs text-slate-400">
                  Directly add an enrolled student into the Student Master database
                </p>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateEnrolledStudent}
              className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStId}
                    onChange={(e) => setNewStId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold bg-slate-50 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Sharma"
                    value={newStName}
                    onChange={(e) => setNewStName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    type="text"
                    placeholder="Father Name"
                    value={newStFather}
                    onChange={(e) => setNewStFather(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Student Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit number"
                    value={newStPhone}
                    onChange={(e) => setNewStPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Parent Alt Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="Optional alt phone"
                    value={newStAltPhone}
                    onChange={(e) => setNewStAltPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Batch / Class *
                  </label>
                  <input
                    type="text"
                    required
                    list="batch-options"
                    value={newStBatch}
                    onChange={(e) => setNewStBatch(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-semibold"
                  />
                  <datalist id="batch-options">
                    {uniqueBatches
                      .filter((b) => b !== "All")
                      .map((b) => (
                        <option key={b} value={b} />
                      ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Stream
                  </label>
                  <input
                    type="text"
                    placeholder="PCM / PCB / Fdn"
                    value={newStStream}
                    onChange={(e) => setNewStStream(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Board
                  </label>
                  <select
                    value={newStBoard}
                    onChange={(e) => setNewStBoard(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-semibold"
                  >
                    <option>CBSE</option>
                    <option>RBSE</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Medium
                  </label>
                  <select
                    value={newStMedium}
                    onChange={(e) => setNewStMedium(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-semibold"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Total Agreed Fees (₹)
                  </label>
                  <input
                    type="number"
                    value={newStTotalFee}
                    onChange={(e) => setNewStTotalFee(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Initial Fee Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={newStPaidFee}
                    onChange={(e) => setNewStPaidFee(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 outline-none font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Admission Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={newStRemarks}
                  onChange={(e) => setNewStRemarks(e.target.value)}
                  placeholder="Optional scholarship or installment details..."
                  className="w-full border border-slate-300 rounded-xl p-3 bg-slate-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStudent}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  {creatingStudent ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(activeStudentModal || activeLeadModal) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-sky-500 text-slate-950 px-2 py-0.5 rounded-lg font-bold">
                    {activeStudentModal
                      ? activeStudentModal.student_id
                      : "SALES LEAD"}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold capitalize truncate">
                    {activeStudentModal
                      ? editFullName || activeStudentModal.full_name
                      : activeLeadModal?.student_name}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {activeStudentModal
                    ? `Batch: ${editBatchClass} • Father: ${
                        editFatherName || "-"
                      } • Ph: ${editContactNumber || "N/A"}`
                    : `Class: ${activeLeadModal?.batch_class} (${activeLeadModal?.board} - ${activeLeadModal?.medium}) • Ph: ${activeLeadModal?.mobile_number}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveStudentModal(null);
                  setActiveLeadModal(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="lg:col-span-6 p-4 sm:p-6 space-y-4 overflow-y-auto">
                {activeStudentModal && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-sky-600" />
                        Student Personal & Batch Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Student Full Name
                          </label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold outline-none disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Father&apos;s Name
                          </label>
                          <input
                            type="text"
                            value={editFatherName}
                            onChange={(e) => setEditFatherName(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold outline-none disabled:bg-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Batch / Class
                          </label>
                          <input
                            type="text"
                            list="batch-options-edit"
                            value={editBatchClass}
                            onChange={(e) => setEditBatchClass(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold outline-none disabled:bg-slate-100"
                          />
                          <datalist id="batch-options-edit">
                            {uniqueBatches
                              .filter((b) => b !== "All")
                              .map((b) => (
                                <option key={b} value={b} />
                              ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Mobile Number
                          </label>
                          <input
                            type="text"
                            value={editContactNumber}
                            onChange={(e) => setEditContactNumber(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-mono font-semibold outline-none disabled:bg-slate-100"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="font-bold text-slate-600 block mb-1">
                            Parent Alt Phone
                          </label>
                          <input
                            type="text"
                            value={editParentAltNumber}
                            onChange={(e) =>
                              setEditParentAltNumber(e.target.value)
                            }
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-mono outline-none disabled:bg-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Stream
                          </label>
                          <input
                            type="text"
                            value={editStream}
                            onChange={(e) => setEditStream(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Board
                          </label>
                          <select
                            value={editBoard}
                            onChange={(e) => setEditBoard(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-2.5 py-2 bg-white font-semibold outline-none disabled:bg-slate-100"
                          >
                            <option>CBSE</option>
                            <option>RBSE</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Medium
                          </label>
                          <select
                            value={editMedium}
                            onChange={(e) => setEditMedium(e.target.value)}
                            disabled={currentRole === "TEACHER"}
                            className="w-full border border-slate-300 rounded-xl px-2.5 py-2 bg-white font-semibold outline-none disabled:bg-slate-100"
                          >
                            <option>English</option>
                            <option>Hindi</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {currentRole !== "TEACHER" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            Fee Package & E-Mandate
                          </h3>
                          <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                            Pending: ₹
                            {(
                              Number(editTotalFees || 0) - Number(modalFeePaid || 0)
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-xs">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Total Fee (₹)
                            </label>
                            <input
                              type="number"
                              value={editTotalFees}
                              onChange={(e) =>
                                setEditTotalFees(Number(e.target.value))
                              }
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Paid Till Date (₹)
                            </label>
                            <input
                              type="number"
                              value={modalFeePaid}
                              onChange={(e) =>
                                setModalFeePaid(Number(e.target.value))
                              }
                              className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold text-emerald-700 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              E-Mandate
                            </label>
                            <select
                              value={modalEMandate}
                              onChange={(e) => setModalEMandate(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl px-2 py-2 bg-white font-bold outline-none"
                            >
                              <option value="Pending">⏳ Pending</option>
                              <option value="Done">✅ Done</option>
                              <option value="Failed">❌ Failed</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              Next Expected Fee (₹)
                            </label>
                            <input
                              type="number"
                              value={modalNextFeeAmount}
                              onChange={(e) =>
                                setModalNextFeeAmount(Number(e.target.value))
                              }
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
                          <option value="Average / Mediocre">
                            Average / Mediocre 📊
                          </option>
                          <option value="Weak Student">Weak Student 🔴</option>
                          <option value="Extremely Weak Student">
                            Extremely Weak 🚨
                          </option>
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
                          <option value="Have Left Already">
                            Have Left Already
                          </option>
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
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase text-sky-950 flex items-center gap-1.5">
                      <FileAudio className="w-4 h-4 text-sky-600" />
                      AI Call Recording Analyzer
                    </h3>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) =>
                        handleAudioFileSelect(e.target.files?.[0] || null)
                      }
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white cursor-pointer"
                    />
                    {modalAudioFile && (
                      <button
                        type="button"
                        onClick={handleAnalyzeCallWithAI}
                        disabled={analyzingCall}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {analyzingCall
                          ? "🎙️ Transcribing & Extracting Actionables..."
                          : `✨ Transcribe & Summarize Call (${modalAudioDuration}s)`}
                      </button>
                    )}
                  </div>
                )}

                {activeStudentModal && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Add New{" "}
                      {currentRole === "TEACHER"
                        ? "Teacher Remark"
                        : "Follow-up Note"}
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
                      {savingModal
                        ? "Saving Changes..."
                        : "💾 Save All Student Edits, Fees & Timeline Note"}
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 p-4 sm:p-6 bg-slate-50/60 overflow-y-auto">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600" />
                    Activity & Call Timeline ({modalTimeline.length})
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Newest first
                  </span>
                </h3>

                {activeStudentModal?.general_remarks && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <span className="font-bold text-amber-900 block mb-1">
                      📌 Admission / Sheet Remark:
                    </span>
                    <p className="text-amber-800 leading-relaxed">
                      {activeStudentModal.general_remarks}
                    </p>
                  </div>
                )}

                {loadingTimeline ? (
                  <p className="text-xs text-slate-400 py-16 text-center">
                    Loading timeline history...
                  </p>
                ) : modalTimeline.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No timeline entries logged yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modalTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-lg border text-[11px] ${
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
                                ? "🎙️ AI Call"
                                : item.entry_type === "TEACHER_REMARK"
                                ? "👨‍🏫 Teacher"
                                : item.entry_type === "FEE_PROMISE"
                                ? "💰 Fee"
                                : "💬 Note"}
                            </span>
                            <span className="font-bold text-slate-700">
                              {item.author_name}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
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
                          <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-xs text-amber-900">
                            <b>⚡ Actionable:</b> {item.action_items}
                          </div>
                        )}

                        {item.transcript && (
                          <details className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
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
