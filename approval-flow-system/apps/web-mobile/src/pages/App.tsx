import { useEffect, useMemo, useState } from "react";
import {
  NavBar,
  TabBar,
  Grid,
  Card,
  Form,
  Input,
  TextArea,
  Button,
  Dialog,
  Toast,
  Space,
  Tag,
  Selector,
  SearchBar,
  Popup,
  CheckList,
  DatePicker,
} from "antd-mobile";
import {
  AppOutline,
  CheckShieldOutline,
  UnorderedListOutline,
  AddSquareOutline,
  FileWrongOutline,
  EnvironmentOutline,
  AppstoreOutline,
  CloseOutline,
} from "antd-mobile-icons";
import "./app.css";
import axios from "axios";

type FlowType =
  | "NEW_TARGET_HOSPITAL"
  | "CANCEL_TARGET_HOSPITAL"
  | "REGION_ADJUSTMENT"
  | "NEW_LINK_PHARMACY"
  | "CANCEL_LINK_PHARMACY";

const flowCards: { type: FlowType; title: string; icon: React.ReactNode }[] = [
  { type: "NEW_TARGET_HOSPITAL", title: "新增目标医院", icon: <AddSquareOutline color="#1677ff" /> },
  { type: "CANCEL_TARGET_HOSPITAL", title: "取消目标医院", icon: <CloseOutline color="#f7a000" /> },
  { type: "REGION_ADJUSTMENT", title: "医院区域调整", icon: <EnvironmentOutline color="#14c9c9" /> },
  { type: "NEW_LINK_PHARMACY", title: "新增关联药房", icon: <AppstoreOutline color="#ff8f1f" /> },
  { type: "CANCEL_LINK_PHARMACY", title: "取消关联药房", icon: <FileWrongOutline color="#49b0ff" /> },
];

const tabs = [
  { key: "workbench", title: "工作台", icon: <AddSquareOutline /> },
  { key: "mine", title: "我的申请", icon: <UnorderedListOutline /> },
  { key: "archive", title: "归档", icon: <CheckShieldOutline /> },
];

const approveFlowRoles = ["MR", "DSM", "RSM", "BISO1", "BISO2", "CD", "RSD"];
const placeholderAvatar = "https://dummyimage.com/40x40/1677ff/ffffff&text=MR";

const apiClient = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000",
  withCredentials: false,
});

function App() {
  const [tab, setTab] = useState("workbench");
  const [currentFlow, setCurrentFlow] = useState<FlowType | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [dirty, setDirty] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [email, setEmail] = useState<string>(() => localStorage.getItem("mockEmail") || "");
  const [actorCode, setActorCode] = useState<string>("");
  const [actorRole, setActorRole] = useState<string>("");
  const [actorName, setActorName] = useState<string>("");
  const [dsmName, setDsmName] = useState<string>("");
  const [rsmName, setRsmName] = useState<string>("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [repOptions, setRepOptions] = useState<{ label: string; value: string; code?: string }[]>([]);
  const [approverMap, setApproverMap] = useState<Record<string, { name?: string; email?: string }>>({});
  const [draftList, setDraftList] = useState<any[]>([]);
  const [submittedList, setSubmittedList] = useState<any[]>([]);
  const [myTab, setMyTab] = useState<"draft" | "submitted">("draft");
  const [searchText, setSearchText] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<FlowType[]>([]);
  const [statusFilter, setStatusFilter] = useState<("IN_PROGRESS" | "APPROVED" | "REJECTED")[]>([]);
  const [timeFilter, setTimeFilter] = useState<"7" | "30" | "90" | "custom" | "all">("all");
  const [customRange, setCustomRange] = useState<{ start?: Date; end?: Date }>({});
  const [showTypePopup, setShowTypePopup] = useState(false);
  const [showTimePopup, setShowTimePopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedDateField, setSelectedDateField] = useState<"start" | "end">("start");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const title = useMemo(() => {
    if (tab === "workbench") return "区域&终端调整";
    if (tab === "mine") return "我的申请";
    if (tab === "archive") return "归档";
    return "审批系统";
  }, [tab]);

  const onCancel = async () => {
    if (!dirty) {
      setCurrentFlow(null);
      form.resetFields();
      setHasContent(false);
      return;
    }
    const result = await Dialog.confirm({
      content: "放弃编辑并返回？",
      cancelText: "继续编辑",
      confirmText: "放弃",
    });
    if (result) {
      setCurrentFlow(null);
      form.resetFields();
      setDirty(false);
      setHasContent(false);
    }
  };

  const saveDraft = async () => {
    if (!hasContent) {
      Toast.show({ icon: "fail", content: "请先填写内容再保存草稿" });
      return;
    }
    try {
      const values = form.getFieldsValue();
      const payload = {
        institutionName: values.institutionName,
        institutionAddress: values.institutionAddress,
        repName: values.repName,
        repCode: values.repCode,
        reason: values.reason,
      };
      const res = await apiClient.post("/workflows", {
        type: "NEW_TARGET_HOSPITAL",
        title: values.title || "",
        payload,
        submittedBy: actorCode,
      });
      const wfId = res.data?.id;
      if (wfId && (values.filename || values.url)) {
        await apiClient.post(`/workflows/${wfId}/attachments`, {
          filename: values.filename,
          url: values.url,
          mimeType: values.mimeType || "image/jpeg",
        });
      }
      Toast.show({ icon: "success", content: "草稿已保存" });
      setDirty(false);
      fetchDrafts();
    } catch (e: any) {
      Toast.show({ icon: "fail", content: e?.response?.data?.message || "保存草稿失败" });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if ((values.reason || "").trim().length < 10) {
        Toast.show({ icon: "fail", content: "新增原因不少于10个字" });
        return;
      }
      if (!values.filename || !values.url) {
        Toast.show({ icon: "fail", content: "请填写文件名和URL" });
        return;
      }
      const payload = {
        institutionName: values.institutionName,
        institutionAddress: values.institutionAddress,
        repName: values.repName,
        repCode: values.repCode,
        reason: values.reason,
      };
      const res = await apiClient.post("/workflows", {
        type: "NEW_TARGET_HOSPITAL",
        title: values.title || "",
        payload,
        submittedBy: actorCode,
      });
      const wfId = res.data?.id;
      if (wfId && values.filename) {
        await apiClient.post(`/workflows/${wfId}/attachments`, {
          filename: values.filename,
          url: values.url,
          mimeType: values.mimeType || "image/jpeg",
        });
        await apiClient.post(`/workflows/${wfId}/actions`, {
          action: "SUBMIT",
          role: actorRole,
        });
      }
      Toast.show({ icon: "success", content: "提交成功" });
      setDirty(false);
    } catch (e) {
      // antd-mobile 表单已提示
    }
  };

  const handleLogin = async () => {
    if (!email) {
      Toast.show({ icon: "fail", content: "请输入邮箱" });
      return;
    }
    try {
      setLoadingLogin(true);
      const res = await apiClient.get("/auth/mock-login", { params: { email } });
      if (!res.data?.actorCode || !res.data?.actorRole) {
        Toast.show({ icon: "fail", content: "未找到映射，请检查邮箱" });
        return;
      }
      setActorCode(res.data.actorCode);
      setActorRole(res.data.actorRole);
      setActorName(res.data.name || "");
      setDsmName(res.data?.hierarchy?.dsmName || "");
      setRsmName(res.data?.hierarchy?.rsmName || "");
      apiClient.defaults.headers.common["x-actor-code"] = res.data.actorCode;
      apiClient.defaults.headers.common["x-actor-role"] = res.data.actorRole;
      apiClient.defaults.headers.common["x-user-email"] = email;
      localStorage.setItem("mockEmail", email);
      Toast.show({ icon: "success", content: `登录成功：${res.data.actorRole}` });
      fetchReps();
      fetchApprovers();
      if (tab === "mine") {
        fetchDrafts();
        fetchSubmitted();
      }
    } catch (e: any) {
      Toast.show({ icon: "fail", content: e?.response?.data?.message || "登录失败" });
    } finally {
      setLoadingLogin(false);
    }
  };

  const fetchReps = async () => {
    if (!actorCode) return;
    try {
      const res = await apiClient.get("/representatives/scope");
      const list =
        res.data?.map((r: any) => ({
          label: `${r.name || r.actorCode}`,
          value: r.name || r.actorCode,
          name: r.name || r.actorCode,
          code: r.actorCode,
        })) || [];
      setRepOptions(list);
    } catch (e) {
      // ignore
    }
  };

  const fetchDrafts = async () => {
    if (!actorCode) return;
    try {
      const res = await apiClient.get("/workflows", {
        params: { status: "DRAFT", actorCode },
      });
      setDraftList(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchSubmitted = async () => {
    if (!actorCode) return;
    try {
      const res = await apiClient.get("/workflows", {
        params: { status: "IN_PROGRESS", actorCode },
      });
      // 后端暂未支持多状态过滤，这里前端过滤非草稿
      const list = (res.data || []).filter(
        (wf: any) => wf.status !== "DRAFT",
      );
      setSubmittedList(list);
    } catch (e) {
      // ignore
    }
  };

  const fetchApprovers = async () => {
    try {
      const res = await apiClient.get("/approver-configs", {
        params: { workflowType: "NEW_TARGET_HOSPITAL" },
      });
      const map: Record<string, { name?: string; email?: string }> = {};
      (res.data || []).forEach((c: any) => {
        map[c.role] = { name: c.name, email: c.email };
      });
      setApproverMap(map);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (email && !actorCode) {
      // 可选：自动尝试静默登录
    }
  }, []);

  useEffect(() => {
    if (tab === "mine" && actorCode) {
      fetchDrafts();
      fetchSubmitted();
    }
  }, [tab, actorCode]);

  const filteredDrafts = useMemo(() => {
    const list = draftList || [];
    const now = new Date();
    const matchTime = (createdAt?: string) => {
      if (!createdAt) return true;
      const ts = new Date(createdAt).getTime();
      if (timeFilter === "all") return true;
      if (timeFilter === "7") return ts >= now.getTime() - 7 * 24 * 3600 * 1000;
      if (timeFilter === "30") return ts >= now.getTime() - 30 * 24 * 3600 * 1000;
      if (timeFilter === "90") return ts >= now.getTime() - 90 * 24 * 3600 * 1000;
      if (timeFilter === "custom" && customRange.start && customRange.end) {
        return (
          ts >= customRange.start.getTime() &&
          ts <= customRange.end.getTime() + 24 * 3600 * 1000 - 1
        );
      }
      return true;
    };
    const matchType = (wfType: FlowType) =>
      typeFilter.length === 0 ? true : typeFilter.includes(wfType);
    const text = searchText.trim();
    const matchText = (wf: any) => {
      if (!text) return true;
      const p = wf.payload || {};
      return (
        (p.institutionName || "").includes(text) ||
        (p.institutionAddress || "").includes(text) ||
        (p.repName || "").includes(text) ||
        (wf.title || "").includes(text)
      );
    };
    return list
      .filter((wf: any) => wf.type === "NEW_TARGET_HOSPITAL")
      .filter((wf: any) => matchType(wf.type))
      .filter((wf: any) => matchTime(wf.createdAt))
      .filter((wf: any) => matchText(wf));
  }, [draftList, typeFilter, timeFilter, customRange, searchText]);

  const filteredSubmitted = useMemo(() => {
    const list = submittedList || [];
    const now = new Date();
    const matchTime = (createdAt?: string) => {
      if (!createdAt) return true;
      const ts = new Date(createdAt).getTime();
      if (timeFilter === "all") return true;
      if (timeFilter === "7") return ts >= now.getTime() - 7 * 24 * 3600 * 1000;
      if (timeFilter === "30") return ts >= now.getTime() - 30 * 24 * 3600 * 1000;
      if (timeFilter === "90") return ts >= now.getTime() - 90 * 24 * 3600 * 1000;
      if (timeFilter === "custom" && customRange.start && customRange.end) {
        return (
          ts >= customRange.start.getTime() &&
          ts <= customRange.end.getTime() + 24 * 3600 * 1000 - 1
        );
      }
      return true;
    };
    const text = searchText.trim();
    const matchText = (wf: any) => {
      if (!text) return true;
      const p = wf.payload || {};
      const names: string[] = [
        p.repName,
        p.institutionName,
        p.institutionAddress,
        wf.title,
      ].filter(Boolean);
      const stepsNames =
        (wf.steps || []).map((s: any) => s.assigneeName || s.assignee || "").filter(Boolean) || [];
      return [...names, ...stepsNames].some((n) => `${n}`.includes(text));
    };
    const matchType = (wfType: FlowType) =>
      typeFilter.length === 0 ? true : typeFilter.includes(wfType);
    const matchStatus = (st: string) =>
      statusFilter.length === 0 ? true : statusFilter.includes(st as any);

    return list
      .filter((wf: any) => wf.type === "NEW_TARGET_HOSPITAL")
      .filter((wf: any) => matchType(wf.type))
      .filter((wf: any) => matchStatus(wf.status))
      .filter((wf: any) => matchTime(wf.createdAt))
      .filter((wf: any) => matchText(wf));
  }, [submittedList, typeFilter, timeFilter, customRange, searchText, statusFilter]);

  const statusTag = (st: string) => {
    if (st === "APPROVED") return <Tag color="primary">已通过</Tag>;
    if (st === "REJECTED") return <Tag color="danger">已驳回</Tag>;
    return <Tag color="success">审批中</Tag>;
  };

  const currentStepInfo = (wf: any) => {
    const steps = wf.steps || [];
    const inProgress = steps.find((s: any) => s.status === "IN_PROGRESS");
    const target = inProgress || steps.find((s: any) => s.status === "DRAFT");
    if (!target) return { role: "", name: "" };
    const role = target.role;
    let name = target.assigneeName || "";
    if (!name) {
      if (role === "MR") name = actorName || "";
      if (role === "DSM") name = dsmName || "";
      if (role === "RSM") name = rsmName || "";
      if (["BISO1", "BISO2", "CD", "RSD"].includes(role)) {
        name = approverMap[role]?.name || "";
      }
    }
    return { role, name };
  };

  const rejectReason = (wf: any) => {
    const actions = wf.actions || [];
    const lastReject = [...actions].reverse().find((a: any) => a.action === "REJECT");
    return lastReject?.comment || "";
  };

  const renderFlowForm = () => {
    if (currentFlow !== "NEW_TARGET_HOSPITAL") {
      return (
        <Card style={{ margin: 12 }}>
          <div style={{ textAlign: "center", padding: 16, color: "#999" }}>
            该流程表单待实现，当前仅支持“新增目标医院”。
          </div>
        </Card>
      );
    }
    return (
      <div style={{ padding: 12 }}>
        <Card title="新增目标医院">
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => {
                setDirty(true);
                const filled = Object.values(all || {}).some(
                  (v) => v !== undefined && v !== null && `${v}`.trim() !== "",
                );
                setHasContent(filled);
              }}
              footer={
                <Space justify="around" block style={{ width: "100%" }}>
                  <Button onClick={onCancel}>取消</Button>
                  <Button onClick={saveDraft} color="primary" fill="outline" disabled={!hasContent || !actorCode}>
                    保存草稿
                  </Button>
                  <Button onClick={handleSubmit} color="primary" disabled={!actorCode}>
                    提交
                  </Button>
                </Space>
              }
            >
            <Form.Item name="institutionName" label="机构名称" rules={[{ required: true, message: "请输入机构名称" }]}>
              <Input placeholder="请输入机构名称" />
            </Form.Item>
            <Form.Item name="institutionAddress" label="机构地址" rules={[{ required: true, message: "请输入机构地址" }]}>
              <Input placeholder="请输入机构地址" />
            </Form.Item>
            <Form.Item name="repName" label="指派代表姓名" rules={[{ required: true, message: "请选择指派代表" }]}>
              <Selector
                options={repOptions.map((r) => ({ label: r.label, value: r.value }))}
                onChange={(val) => {
                  const rep = repOptions.find((r) => r.value === val[0]);
                  if (rep) {
                    form.setFieldsValue({ repCode: rep.code, repName: rep.label });
                  }
                }}
                columns={1}
              />
            </Form.Item>
            <Form.Item name="repCode" label="指派代表岗位号" rules={[{ required: true, message: "自动带出岗位号" }]}>
              <Input placeholder="选择代表后自动带出" readOnly />
            </Form.Item>
            <Form.Item label="证明材料（必填，填写文件名与URL）">
              <Space direction="vertical" block>
                <Form.Item name="filename" rules={[{ required: true, message: "请输入文件名" }]} noStyle>
                  <Input placeholder="例如 proof.jpg" />
                </Form.Item>
                <Form.Item name="url" rules={[{ required: true, message: "请输入URL" }]} noStyle>
                  <Input placeholder="可访问的链接" />
                </Form.Item>
                <Form.Item name="mimeType" initialValue="image/jpeg" noStyle>
                  <Input placeholder="image/jpeg" />
                </Form.Item>
              </Space>
            </Form.Item>
            <Form.Item name="reason" label="新增原因" rules={[{ required: true, message: "请输入新增原因" }]}>
              <TextArea placeholder="不少于10字" maxLength={100} rows={3} />
            </Form.Item>
          </Form>
        </Card>

        <Card title="审批流程" style={{ marginTop: 12 }}>
          <Space direction="vertical" block style={{ width: "100%" }}>
            {approveFlowRoles.map((role) => {
              let name = approverMap[role]?.name || "占位";
              if (role === "MR") name = actorName || "占位";
              if (role === "DSM") name = dsmName || "占位";
              if (role === "RSM") name = rsmName || "占位";
              return (
                <div
                  key={role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <Space align="center">
                    <img
                      src={placeholderAvatar}
                      alt="avatar"
                      style={{ width: 36, height: 36, borderRadius: "50%" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{role}</span>
                      <span style={{ color: "#999" }}>姓名：{name}</span>
                    </div>
                  </Space>
                  <Tag color="primary">待审批</Tag>
                </div>
              );
            })}
          </Space>
        </Card>
      </div>
    );
  };

  const renderWorkbench = () => (
    <div style={{ padding: 12 }}>
      <Card style={{ marginBottom: 12 }}>
        <Space direction="vertical" block>
          <Input
            placeholder="输入企业邮箱（mock-login）"
            value={email}
            onChange={(val) => setEmail(val)}
          />
          <Button color="primary" onClick={handleLogin} loading={loadingLogin}>
            登录
          </Button>
          {actorCode && (
            <div style={{ color: "#1677ff" }}>
              登录成功：{actorRole} / {actorCode}
            </div>
          )}
        </Space>
      </Card>
      {!currentFlow ? (
        <Card>
          <Grid columns={3} gap={12}>
            {flowCards.map((f) => (
              <Grid.Item key={f.type}>
                <div
                  style={{
                    borderRadius: 12,
                    background: "#f7f8fa",
                    padding: "14px 12px",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    setCurrentFlow(f.type);
                    form.resetFields();
                    setDirty(false);
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, color: "#1d2129" }}>{f.title}</div>
                </div>
              </Grid.Item>
            ))}
          </Grid>
        </Card>
      ) : (
        renderFlowForm()
      )}
    </div>
  );

  return (
    <div className="page">
      <NavBar backArrow={!!currentFlow} onBack={currentFlow ? onCancel : undefined}>
        {title}
      </NavBar>
      <div className="content">
        {tab === "workbench" && renderWorkbench()}
        {tab === "mine" && (
          <div style={{ padding: 12, maxWidth: 430, margin: "0 auto" }}>
            <Space justify="around" style={{ width: "100%", marginBottom: 8 }}>
              <Button
                size="small"
                color={myTab === "draft" ? "primary" : "default"}
                onClick={() => setMyTab("draft")}
              >
                草稿
              </Button>
              <Button
                size="small"
                color={myTab === "submitted" ? "primary" : "default"}
                onClick={() => setMyTab("submitted")}
              >
                已提交
              </Button>
            </Space>

            {myTab === "draft" && (
              <>
                <SearchBar
                  placeholder="请输入机构名称或人员姓名"
                  value={searchText}
                  onChange={setSearchText}
                  style={{ marginBottom: 8 }}
                />
                <Space justify="between" block style={{ marginBottom: 8 }}>
                  <Button
                    size="small"
                    onClick={() => setShowTypePopup(true)}
                    color="default"
                  >
                    审批类型{typeFilter.length ? `(${typeFilter.length})` : ""}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowTimePopup(true)}
                    color="default"
                  >
                    保存时间
                  </Button>
                </Space>

                {filteredDrafts.length === 0 && (
                  <Card>
                    <div style={{ textAlign: "center", color: "#999" }}>暂无草稿</div>
                  </Card>
                )}

                <Space direction="vertical" block>
                  {filteredDrafts.map((wf: any) => {
                    const p = wf.payload || {};
                    const created = wf.createdAt
                      ? new Date(wf.createdAt).toLocaleDateString()
                      : "";
                    return (
                      <Card key={wf.id} title="新增目标医院" extra={created}>
                        <div style={{ marginBottom: 6, color: "#1d2129" }}>
                          机构名称：{p.institutionName || "-"}
                        </div>
                        <div style={{ marginBottom: 6, color: "#1d2129" }}>
                          机构地址：{p.institutionAddress || "-"}
                        </div>
                        <div style={{ marginBottom: 12, color: "#1d2129" }}>
                          指派代表姓名：{p.repName || "-"}
                        </div>
                        <Space>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => {
                              setTab("workbench");
                              setCurrentFlow("NEW_TARGET_HOSPITAL");
                              setEditingWorkflowId(wf.id);
                              form.setFieldsValue({
                                title: wf.title || "",
                                institutionName: p.institutionName,
                                institutionAddress: p.institutionAddress,
                                repName: p.repName,
                                repCode: p.repCode,
                                reason: p.reason,
                                filename: wf.files?.[0]?.filename,
                                url: wf.files?.[0]?.url,
                                mimeType: wf.files?.[0]?.mimeType || "image/jpeg",
                              });
                              setDirty(false);
                              setHasContent(true);
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            size="small"
                            color="danger"
                            onClick={async () => {
                              const ok = await Dialog.confirm({
                                content: "确认删除草稿？",
                              });
                              if (!ok) return;
                              try {
                                await apiClient.post(`/workflows/${wf.id}/delete`);
                                Toast.show({ icon: "success", content: "已删除" });
                                fetchDrafts();
                              } catch (e: any) {
                                Toast.show({
                                  icon: "fail",
                                  content: e?.response?.data?.message || "删除失败",
                                });
                              }
                            }}
                          >
                            删除
                          </Button>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>

                <Popup visible={showTypePopup} onMaskClick={() => setShowTypePopup(false)}>
                  <Card title="审批类型" style={{ maxHeight: "70vh", overflow: "auto" }}>
                    <CheckList
                      multiple
                      value={typeFilter}
                      onChange={(val) => setTypeFilter(val as FlowType[])}
                    >
                      {flowCards.map((f) => (
                        <CheckList.Item key={f.type} value={f.type}>
                          {f.title}
                        </CheckList.Item>
                      ))}
                    </CheckList>
                    <Space justify="end" style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => setTypeFilter([])}>
                        重置
                      </Button>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => setShowTypePopup(false)}
                      >
                        确认
                      </Button>
                    </Space>
                  </Card>
                </Popup>

                <Popup visible={showTimePopup} onMaskClick={() => setShowTimePopup(false)}>
                  <Card title="保存时间" style={{ maxHeight: "70vh", overflow: "auto" }}>
                    <CheckList
                      value={[timeFilter]}
                      onChange={(val) => {
                        const picked = (val as any)[0] as typeof timeFilter;
                        setTimeFilter(picked);
                        if (picked !== "custom") {
                          setCustomRange({});
                        }
                      }}
                    >
                      <CheckList.Item value="7">近7日</CheckList.Item>
                      <CheckList.Item value="30">近30日</CheckList.Item>
                      <CheckList.Item value="90">近90日</CheckList.Item>
                      <CheckList.Item value="all">全部</CheckList.Item>
                      <CheckList.Item value="custom">自定义区间</CheckList.Item>
                    </CheckList>
                    {timeFilter === "custom" && (
                      <Space direction="vertical" block style={{ marginTop: 8 }}>
                        <Space>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedDateField("start");
                              setShowDatePicker(true);
                            }}
                          >
                            开始：{customRange.start?.toLocaleDateString?.() || "请选择"}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedDateField("end");
                              setShowDatePicker(true);
                            }}
                          >
                            结束：{customRange.end?.toLocaleDateString?.() || "请选择"}
                          </Button>
                        </Space>
                        <DatePicker
                          title="选择日期"
                          visible={showDatePicker}
                          onClose={() => setShowDatePicker(false)}
                          onConfirm={(val) => {
                            if (selectedDateField === "start") {
                              setCustomRange((prev) => ({ ...prev, start: val }));
                            } else {
                              setCustomRange((prev) => ({ ...prev, end: val }));
                            }
                            setShowDatePicker(false);
                          }}
                        />
                      </Space>
                    )}
                    <Space justify="end" style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setTimeFilter("all");
                          setCustomRange({});
                        }}
                      >
                        重置
                      </Button>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => setShowTimePopup(false)}
                      >
                        确认
                      </Button>
                    </Space>
                  </Card>
                </Popup>
              </>
            )}

            {myTab === "submitted" && (
              <>
                <SearchBar
                  placeholder="请输入机构名称或人员姓名"
                  value={searchText}
                  onChange={setSearchText}
                  style={{ marginBottom: 8 }}
                />
                <Space justify="between" block style={{ marginBottom: 8 }}>
                  <Button size="small" onClick={() => setShowStatusPopup(true)}>
                    审批状态{statusFilter.length ? `(${statusFilter.length})` : ""}
                  </Button>
                  <Button size="small" onClick={() => setShowTypePopup(true)}>
                    审批类型{typeFilter.length ? `(${typeFilter.length})` : ""}
                  </Button>
                  <Button size="small" onClick={() => setShowTimePopup(true)}>
                    提交时间
                  </Button>
                </Space>

                {filteredSubmitted.length === 0 && (
                  <Card>
                    <div style={{ textAlign: "center", color: "#999" }}>暂无已提交</div>
                  </Card>
                )}

                <Space direction="vertical" block>
                  {filteredSubmitted.map((wf: any) => {
                    const p = wf.payload || {};
                    const created = wf.createdAt
                      ? new Date(wf.createdAt).toLocaleDateString()
                      : "";
                    const cur = currentStepInfo(wf);
                    const rej = rejectReason(wf);
                    return (
                      <Card
                        key={wf.id}
                        title={
                          <Space>
                            <span>新增目标医院</span>
                            {statusTag(wf.status)}
                          </Space>
                        }
                        extra={created}
                      >
                        <div style={{ marginBottom: 6, color: "#1d2129" }}>
                          机构名称：{p.institutionName || "-"}
                        </div>
                        <div style={{ marginBottom: 6, color: "#1d2129" }}>
                          机构地址：{p.institutionAddress || "-"}
                        </div>
                        <div style={{ marginBottom: 12, color: "#1d2129" }}>
                          指派代表姓名：{p.repName || "-"}
                        </div>
                        {wf.status === "IN_PROGRESS" && (
                          <div style={{ marginBottom: 8, color: "#1d2129" }}>
                            当前节点：{cur.role || "-"}，审批人：{cur.name || "占位"}
                          </div>
                        )}
                        {wf.status === "REJECTED" && (
                          <div style={{ marginBottom: 8, color: "#e5484d" }}>
                            驳回原因：{rej || "未填写"}
                          </div>
                        )}
                        <Space>
                          {wf.status === "REJECTED" && (
                            <Button
                              size="small"
                              color="primary"
                              onClick={() => {
                                setTab("workbench");
                                setCurrentFlow("NEW_TARGET_HOSPITAL");
                                setEditingWorkflowId(wf.id);
                                form.setFieldsValue({
                                  title: wf.title || "",
                                  institutionName: p.institutionName,
                                  institutionAddress: p.institutionAddress,
                                  repName: p.repName,
                                  repCode: p.repCode,
                                  reason: p.reason,
                                  filename: wf.files?.[0]?.filename,
                                  url: wf.files?.[0]?.url,
                                  mimeType: wf.files?.[0]?.mimeType || "image/jpeg",
                                });
                                setDirty(false);
                                setHasContent(true);
                              }}
                            >
                              重新编辑
                            </Button>
                          )}
                        </Space>
                      </Card>
                    );
                  })}
                </Space>

                <Popup visible={showStatusPopup} onMaskClick={() => setShowStatusPopup(false)}>
                  <Card title="审批状态">
                    <CheckList
                      multiple
                      value={statusFilter}
                      onChange={(val) =>
                        setStatusFilter(
                          (val as any) as ("IN_PROGRESS" | "APPROVED" | "REJECTED")[],
                        )
                      }
                    >
                      <CheckList.Item value="IN_PROGRESS">审批中</CheckList.Item>
                      <CheckList.Item value="APPROVED">已通过</CheckList.Item>
                      <CheckList.Item value="REJECTED">已驳回</CheckList.Item>
                    </CheckList>
                    <Space justify="end" style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => setStatusFilter([])}>
                        重置
                      </Button>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => setShowStatusPopup(false)}
                      >
                        确认
                      </Button>
                    </Space>
                  </Card>
                </Popup>
              </>
            )}
          </div>
        )}
        {tab === "archive" && (
          <div style={{ padding: 12 }}>
            <Card>
              <div style={{ color: "#999", textAlign: "center" }}>“归档”列表待接入 API</div>
            </Card>
          </div>
        )}
      </div>
      <TabBar activeKey={tab} onChange={setTab}>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </div>
  );
}

export default App;
