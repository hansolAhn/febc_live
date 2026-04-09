"use client";

import { useMemo, useState } from "react";
import type { AuditLogItem, LoginAttemptLogItem } from "@/lib/mock-api";

function matchesObservedAt(value: string, observedAt: string) {
  if (!observedAt) {
    return true;
  }

  const current = new Date(value);
  const target = new Date(observedAt);

  if (Number.isNaN(current.getTime()) || Number.isNaN(target.getTime())) {
    return false;
  }

  return Math.abs(current.getTime() - target.getTime()) <= 12 * 60 * 60 * 1000;
}

export function useAuditLogFilters(auditLogs: AuditLogItem[], loginAttemptLogs: LoginAttemptLogItem[]) {
  const [observedAt, setObservedAt] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [usernameKeyword, setUsernameKeyword] = useState("");
  const [branchKeyword, setBranchKeyword] = useState("ALL");
  const [ipKeyword, setIpKeyword] = useState("");

  const auditEventOptions = useMemo(() => {
    const unique = Array.from(new Set(auditLogs.map((log) => log.actionLabel))).sort();
    return ["ALL", ...unique];
  }, [auditLogs]);

  const branchOptions = useMemo(() => {
    const unique = Array.from(
      new Set([
        ...auditLogs.map((log) => log.branchLabel).filter(Boolean),
        ...loginAttemptLogs.map((log) => log.branchLabel).filter(Boolean)
      ])
    ).sort();
    return ["ALL", ...unique];
  }, [auditLogs, loginAttemptLogs]);

  const filteredAuditLogs = useMemo(() => {
    const usernameNeedle = usernameKeyword.trim().toLowerCase();
    const ipNeedle = ipKeyword.trim().toLowerCase();

    return auditLogs.filter((log) => {
      if (!matchesObservedAt(log.createdAt, observedAt)) return false;
      if (selectedEvent !== "ALL" && log.actionLabel !== selectedEvent) return false;
      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) return false;
      if (usernameNeedle && !log.payloadSummary.toLowerCase().includes(usernameNeedle)) return false;
      if (ipNeedle && !log.actorIp.toLowerCase().includes(ipNeedle)) return false;
      return true;
    });
  }, [auditLogs, branchKeyword, ipKeyword, observedAt, selectedEvent, usernameKeyword]);

  const filteredLoginAttemptLogs = useMemo(() => {
    const usernameNeedle = usernameKeyword.trim().toLowerCase();
    const ipNeedle = ipKeyword.trim().toLowerCase();

    return loginAttemptLogs.filter((log) => {
      if (!matchesObservedAt(log.createdAt, observedAt)) return false;
      if (branchKeyword !== "ALL" && log.branchLabel !== branchKeyword) return false;
      if (usernameNeedle && !log.username.toLowerCase().includes(usernameNeedle)) return false;
      if (ipNeedle && !log.attemptIp.toLowerCase().includes(ipNeedle)) return false;
      if (selectedEvent !== "ALL") {
        const normalizedSelectedEvent = selectedEvent.replaceAll(" ", "");
        const normalizedResult = log.resultLabel.replaceAll(" ", "");
        const normalizedReason = log.failureReasonLabel.replaceAll(" ", "");

        if (!normalizedResult.includes(normalizedSelectedEvent) && !normalizedReason.includes(normalizedSelectedEvent)) {
          return false;
        }
      }
      return true;
    });
  }, [branchKeyword, ipKeyword, loginAttemptLogs, observedAt, selectedEvent, usernameKeyword]);

  function resetFilters() {
    setObservedAt("");
    setSelectedEvent("ALL");
    setUsernameKeyword("");
    setBranchKeyword("ALL");
    setIpKeyword("");
  }

  return {
    observedAt,
    setObservedAt,
    selectedEvent,
    setSelectedEvent,
    usernameKeyword,
    setUsernameKeyword,
    branchKeyword,
    setBranchKeyword,
    ipKeyword,
    setIpKeyword,
    auditEventOptions,
    branchOptions,
    filteredAuditLogs,
    filteredLoginAttemptLogs,
    resetFilters
  };
}
