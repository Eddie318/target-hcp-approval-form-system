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
  AddSquareOutline,
  FileWrongOutline,
  EnvironmentOutline,
  AppstoreOutline,
  CloseOutline,
  UploadOutline,
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

const flowTitleMap: Record<FlowType, string> = flowCards.reduce((acc, cur) => {
  acc[cur.type] = cur.title;
  return acc;
}, {} as Record<FlowType, string>);

const tabs = [
  { key: "workbench", title: "发起申请", icon: <AddSquareOutline /> },
  { key: "submitted", title: "已提交", icon: <UploadOutline /> },
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
  const [email, setEmail] = useState<string>(() => localStorage.getItem("mockEmail") || "");
  const [actorCode, setActorCode] = useState<string>("");
  const [actorRole, setActorRole] = useState<string>("");
  const [actorName, setActorName] = useState<string>("");
  const [dsmName, setDsmName] = useState<string>("");
  const [rsmName, setRsmName] = useState<string>("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [repOptions, setRepOptions] = useState<{ label: string; value: string; code?: string }[]>([]);
  const [approverMap, setApproverMap] = useState<Record<string, { name?: string; email?: string }>>({});
  const [submittedList, setSubmittedList] = useState<any[]>([]);
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
    if (tab === "workbench") return currentFlow ? flowTitleMap[currentFlow] || "发起申请" : "发起申请";
    if (tab === "submitted") return "已提交";
    return "审批系统";
  }, [tab, currentFlow]);

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
      fetchReps(res.data.actorCode);
      fetchApprovers();
      if (tab === "submitted") {
        fetchSubmitted();
      }
    } catch (e: any) {
      Toast.show({ icon: "fail", content: e?.response?.data?.message || "登录失败" });
    } finally {
      setLoadingLogin(false);
    }
  };

  const fetchReps = async (codeOverride?: string) => {
    const code = codeOverride || actorCode;
    if (!code) return;
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
    if (actorCode) {
      fetchReps(actorCode);
    }
  }, [actorCode]);

  useEffect(() => {
    if (tab === "submitted" && actorCode) {
      fetchSubmitted();
    }
  }, [tab, actorCode]);

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
      <div style={{ padding: currentFlow ? "0 0 80px 0" : "0 0 80px 0", width: "100%", boxSizing: "border-box" }}>
        <Form
          form={form}
          layout="vertical"
          style={{ width: "100%", padding: "0 6px" }}
          requiredMarkStyle="asterisk"
        >
          <Form.Item name="institutionName" label="机构名称" rules={[{ required: true, message: "请输入机构名称" }]}>
            <Input placeholder="请输入机构名称" style={{ "--text-align": "left" } as any} />
          </Form.Item>
          <Form.Item name="institutionAddress" label="机构地址" rules={[{ required: true, message: "请输入机构地址" }]}>
            <Input placeholder="请输入机构地址" style={{ "--text-align": "left" } as any} />
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
            <Input placeholder="选择代表后自动带出" readOnly style={{ "--text-align": "left" } as any} />
          </Form.Item>
          <Form.Item label="证明材料（必填，填写文件名与URL）">
            <Space direction="vertical" block>
              <Form.Item name="filename" rules={[{ required: true, message: "请输入文件名" }]} noStyle>
                <Input placeholder="例如 proof.jpg" style={{ "--text-align": "left" } as any} />
              </Form.Item>
              <Form.Item name="url" rules={[{ required: true, message: "请输入URL" }]} noStyle>
                <Input placeholder="可访问的链接" style={{ "--text-align": "left" } as any} />
              </Form.Item>
              <Form.Item name="mimeType" initialValue="image/jpeg" noStyle>
                <Input placeholder="image/jpeg" style={{ "--text-align": "left" } as any} />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="reason" label="新增原因" rules={[{ required: true, message: "请输入新增原因" }]}>
            <TextArea placeholder="不少于10字" maxLength={100} rows={3} />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, marginBottom: 80 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>审批流程</div>
          <Space direction="vertical" style={{ width: "100%" }}>
            {approveFlowRoles.map((role) => {
              let name = approverMap[role]?.name || "占位";
              if (role === "MR") name = actorName || "占位";
              if (role === "DSM") name = dsmName || "占位";
              if (role === "RSM") name = rsmName || "占位";
              return (
                <div
                  key={role}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #f0f0f0",
                    width: "100%",
                  }}
                >
                  {role}：{name}
                </div>
              );
            })}
          </Space>
        </div>

        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: 12,
            background: "#fff",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <Button block color="primary" onClick={handleSubmit} disabled={!actorCode}>
            提交
          </Button>
        </div>
      </div>
    );
  };

  const renderWorkbench = () => (
    <div style={{ padding: 12, maxWidth: 430, margin: "0 auto" }}>
      {!actorCode && (
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
          </Space>
        </Card>
      )}
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
                    opacity: actorCode ? 1 : 0.4,
                  }}
                  onClick={() => {
                    if (!actorCode) {
                      Toast.show({ icon: "fail", content: "请先登录" });
                      return;
                    }
                    setCurrentFlow(f.type);
                    form.resetFields();
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
      <NavBar
        backArrow={!!currentFlow}
        onBack={
          currentFlow
            ? () => {
                setCurrentFlow(null);
                form.resetFields();
              }
            : undefined
        }
        style={{
          position: currentFlow ? "sticky" : "relative",
          top: 0,
          zIndex: 100,
          background: "#fff",
        }}
      >
        {title}
      </NavBar>
      <div className="content">
        {tab === "workbench" && renderWorkbench()}
        {tab === "submitted" && (
          <div style={{ padding: 12, maxWidth: 430, margin: "0 auto" }}>
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
          </div>
        )}
      </div>
      {!currentFlow && (
        <TabBar
          activeKey={tab}
          onChange={(key) => {
            if (!actorCode && key !== "workbench") {
              Toast.show({ icon: "fail", content: "请先登录" });
              return;
            }
            setTab(key);
          }}
        >
          {tabs.map((item) => (
            <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
          ))}
        </TabBar>
      )}
    </div>
  );
}

export default App;
