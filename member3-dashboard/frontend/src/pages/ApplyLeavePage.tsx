import { useState, useId, useMemo } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  History,
  Info,
} from "lucide-react";
import type { LeaveTypeName } from "../types/leave";
import { calculateWorkingDays } from "../services/leaveService";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { applyForLeave, clearSubmitStatus } from "../features/leave/leaveApplicationsSlice";
import { showToast } from "../features/toast/toastSlice";

interface FormErrors {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export default function ApplyLeavePage() {
  const formId = useId();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const balances = useAppSelector((state) => state.leaveBalances.balances);
  const submitting = useAppSelector((state) => state.leaveApplications.submitStatus === "submitting");
  const submitError = useAppSelector((state) => state.leaveApplications.submitError);

  const [leaveType, setLeaveType] = useState<LeaveTypeName>("Casual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Compute business days live
  const calculatedDays = useMemo(() => {
    return startDate && endDate ? calculateWorkingDays(startDate, endDate) : 0;
  }, [startDate, endDate]);

  // Selected leave balance
  const selectedBalance = useMemo(() => {
    if (!balances) return null;
    if (leaveType === "Sick Leave") return balances.sick;
    if (leaveType === "Casual Leave") return balances.casual;
    if (leaveType === "Earned Leave") return balances.earned;
    return balances.unpaid;
  }, [balances, leaveType]);

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!leaveType) {
      errors.leaveType = "Please select a leave category.";
    }

    if (!startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!endDate) {
      errors.endDate = "End date is required.";
    } else if (startDate && endDate < startDate) {
      errors.endDate = "End date cannot be earlier than start date.";
    }

    if (startDate && endDate && calculatedDays <= 0) {
      errors.endDate = "The selected date range contains no working days.";
    }

    if (!reason.trim()) {
      errors.reason = "Please enter a reason for this leave request.";
    } else if (reason.trim().length < 5) {
      errors.reason = "Reason must be at least 5 characters.";
    }

    if (
      selectedBalance &&
      selectedBalance.available !== null &&
      calculatedDays > selectedBalance.available
    ) {
      errors.leaveType = `Insufficient balance. Available: ${selectedBalance.available} days, Requested: ${calculatedDays} days.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearSubmitStatus());

    if (!validate()) {
      return;
    }

    const action = await dispatch(
      applyForLeave({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      })
    );

    if (applyForLeave.fulfilled.match(action)) {
      setSubmissionSuccess(true);
      dispatch(
        showToast({
          type: "success",
          title: "Application Submitted",
          message: `${action.payload.leaveType} (${action.payload.days} days) submitted for review.`,
        })
      );
    } else {
      dispatch(
        showToast({
          type: "error",
          title: "Submission Error",
          message: (action.payload as string) || "Failed to submit leave application.",
        })
      );
    }
  };

  const handleApplyAnother = () => {
    setSubmissionSuccess(false);
    setStartDate("");
    setEndDate("");
    setReason("");
    setFieldErrors({});
    dispatch(clearSubmitStatus());
  };

  return (
    <div className="lf-content">
      <section className="lf-page-heading">
        <div>
          <h1>Apply for Leave</h1>
          <p>Submit a new leave request for approval.</p>
        </div>

        <div className="lf-heading-actions">
          <Link to="/leave/history" className="lf-button lf-button-secondary">
            <History size={16} />
            <span>Leave History</span>
          </Link>
        </div>
      </section>

      {/* Submission Success Banner */}
      {submissionSuccess && (
        <div className="lf-form-card lf-success-card" role="alert">
          <div className="lf-success-icon">
            <CheckCircle2 size={32} />
          </div>
          <div className="lf-success-content">
            <h2>Application Submitted</h2>
            <p>
              Your request for <strong>{calculatedDays} working days</strong> of{" "}
              <strong>{leaveType}</strong> from <strong>{startDate}</strong> to{" "}
              <strong>{endDate}</strong> has been submitted.
            </p>
            <div className="lf-success-actions">
              <button
                type="button"
                className="lf-button lf-button-primary"
                onClick={() => navigate("/leave/history")}
              >
                <History size={16} />
                <span>View in Leave History</span>
              </button>
              <button
                type="button"
                className="lf-button lf-button-secondary"
                onClick={handleApplyAnother}
              >
                <RotateCcw size={15} />
                <span>Submit Another Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Failure Alert */}
      {submitError && (
        <div className="lf-error" role="alert">
          <AlertCircle size={18} />
          <span>{submitError}</span>
          <button type="button" onClick={() => dispatch(clearSubmitStatus())}>
            Dismiss
          </button>
        </div>
      )}

      {!submissionSuccess && (
        <div className="lf-apply-layout">
          {/* Main Application Form */}
          <form
            className="lf-form-card"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Leave Application Form"
          >
            <div className="lf-form-section-title">
              <h2>Request Details</h2>
              <p>Specify dates and reason for absence.</p>
            </div>

            {/* Leave Type Selector */}
            <div className="lf-form-group">
              <label htmlFor={`${formId}-leaveType`}>
                Leave Type <span className="lf-req">*</span>
              </label>
              <select
                id={`${formId}-leaveType`}
                value={leaveType}
                onChange={(e) => {
                  setLeaveType(e.target.value as LeaveTypeName);
                  if (fieldErrors.leaveType) {
                    setFieldErrors((prev) => ({ ...prev, leaveType: undefined }));
                  }
                }}
                disabled={submitting}
                className={fieldErrors.leaveType ? "has-error" : ""}
                aria-invalid={Boolean(fieldErrors.leaveType)}
                aria-describedby={
                  fieldErrors.leaveType ? `${formId}-leaveType-err` : undefined
                }
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
              {fieldErrors.leaveType && (
                <span
                  id={`${formId}-leaveType-err`}
                  className="lf-field-error"
                  role="alert"
                >
                  <AlertCircle size={13} /> {fieldErrors.leaveType}
                </span>
              )}
            </div>

            {/* Date Range Inputs */}
            <div className="lf-form-row">
              <div className="lf-form-group">
                <label htmlFor={`${formId}-startDate`}>
                  Start Date <span className="lf-req">*</span>
                </label>
                <div className="lf-input-icon-wrap">
                  <Calendar size={16} aria-hidden="true" />
                  <input
                    type="date"
                    id={`${formId}-startDate`}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (fieldErrors.startDate) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          startDate: undefined,
                        }));
                      }
                    }}
                    disabled={submitting}
                    className={fieldErrors.startDate ? "has-error" : ""}
                    aria-invalid={Boolean(fieldErrors.startDate)}
                    aria-describedby={
                      fieldErrors.startDate ? `${formId}-startDate-err` : undefined
                    }
                  />
                </div>
                {fieldErrors.startDate && (
                  <span
                    id={`${formId}-startDate-err`}
                    className="lf-field-error"
                    role="alert"
                  >
                    <AlertCircle size={13} /> {fieldErrors.startDate}
                  </span>
                )}
              </div>

              <div className="lf-form-group">
                <label htmlFor={`${formId}-endDate`}>
                  End Date <span className="lf-req">*</span>
                </label>
                <div className="lf-input-icon-wrap">
                  <Calendar size={16} aria-hidden="true" />
                  <input
                    type="date"
                    id={`${formId}-endDate`}
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (fieldErrors.endDate) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          endDate: undefined,
                        }));
                      }
                    }}
                    disabled={submitting}
                    className={fieldErrors.endDate ? "has-error" : ""}
                    aria-invalid={Boolean(fieldErrors.endDate)}
                    aria-describedby={
                      fieldErrors.endDate ? `${formId}-endDate-err` : undefined
                    }
                  />
                </div>
                {fieldErrors.endDate && (
                  <span
                    id={`${formId}-endDate-err`}
                    className="lf-field-error"
                    role="alert"
                  >
                    <AlertCircle size={13} /> {fieldErrors.endDate}
                  </span>
                )}
              </div>
            </div>

            {/* Calculated Working Days Chip */}
            {startDate && endDate && (
              <div
                className={`lf-calculation-badge ${
                  calculatedDays <= 0 ? "warning" : "valid"
                }`}
              >
                <Info size={15} />
                <span>
                  {calculatedDays <= 0
                    ? "Zero working days in selected range (weekends only)."
                    : `Duration: ${calculatedDays} working ${
                        calculatedDays === 1 ? "day" : "days"
                      } (weekends excluded)`}
                </span>
              </div>
            )}

            {/* Reason Textarea */}
            <div className="lf-form-group">
              <label htmlFor={`${formId}-reason`}>
                Reason <span className="lf-req">*</span>
              </label>
              <textarea
                id={`${formId}-reason`}
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (fieldErrors.reason) {
                    setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                  }
                }}
                disabled={submitting}
                placeholder="Reason for leave request..."
                className={fieldErrors.reason ? "has-error" : ""}
                aria-invalid={Boolean(fieldErrors.reason)}
                aria-describedby={
                  fieldErrors.reason ? `${formId}-reason-err` : undefined
                }
              />
              {fieldErrors.reason && (
                <span
                  id={`${formId}-reason-err`}
                  className="lf-field-error"
                  role="alert"
                >
                  <AlertCircle size={13} /> {fieldErrors.reason}
                </span>
              )}
            </div>

            {/* Form Actions */}
            <div className="lf-form-actions">
              <button
                type="submit"
                className="lf-button lf-button-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="lf-spinner lf-spinner-sm" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Application</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="lf-button lf-button-secondary"
                disabled={submitting}
                onClick={handleApplyAnother}
              >
                Reset
              </button>
            </div>
          </form>

          {/* Right Sidebar: Balance Breakdown */}
          <aside className="lf-apply-sidebar" aria-label="Balance Information">
            <div className="lf-balance-widget">
              <h3>Balance Information</h3>
              <p>Current balance for selected type:</p>

              <div className="lf-selected-balance-box">
                <strong>{leaveType}</strong>
                <div className="lf-balance-big-val">
                  {selectedBalance?.available !== null
                    ? `${selectedBalance?.available ?? "Unavailable"} days`
                    : "On Request"}
                </div>
                <span>
                  {selectedBalance?.available !== null && selectedBalance?.total
                    ? `${selectedBalance.used} of ${selectedBalance.total} days taken`
                    : "Subject to approval"}
                </span>
              </div>

              <div className="lf-policy-notes">
                <div className="lf-policy-item">
                  <HelpCircle size={15} />
                  <div>
                    <strong>Review Workflow</strong>
                    <p>
                      Requests over 5 working days require secondary approval.
                    </p>
                  </div>
                </div>

                <div className="lf-policy-item">
                  <HelpCircle size={15} />
                  <div>
                    <strong>Cancellations</strong>
                    <p>
                      Pending requests can be cancelled directly from the portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
