import { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Typography,
  Flex,
  Input,
  Button,
  Card,
  message,
  Space,
  Tag,
  List,
  Form,
  Select,
  Divider,
  Alert,
} from "antd";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import "./app.css";
import { apiClient, setAuthHeaders } from "../api/client";

const { Header, Content, Sider } = Layout;

const menuItems = [
  { key: "workflows", icon: <FileTextOutlined />, label: "流程列表" },
  { key: "approve", icon: <CheckCircleOutlined />, label: "审批处理" },
  { key: "import", icon: <CloudUploadOutlined />, label: "导入记录" },
  { key: "export", icon: <CloudDownloadOutlined />, label: "导出记录" },
  { key: "approver", icon: <TeamOutlined />, label: "节点人员配置" },
];

function App() {
  const [email, setEmail] = useState<string>(() => localStorage.getItem("mockEmail") || "");
  const [actorCode, setActorCode] = useState<string | null>(null);
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const [createForm] = Form.useForm();
  const [newHospitalForm] = Form.useForm();
  const [actionForm] = Form.useForm();
  const [attachForm] = Form.useForm();
  const [loadingNewHospital, setLoadingNewHospital] = useState(false);
  const [createType, setCreateType] = useState<string>("NEW_TARGET_HOSPITAL");
  // 模拟代表列表，实际应由后端按权限返回
  const mockRepOptions = [
    { label: "张艳萍 (NCNSCC0C104)", value: "NCNSCC0C104", name: "张艳萍" },
    { label: "刘瑶 (NCNSCC0C101)", value: "NCNSCC0C101", name: "刘瑶" },
    { label: "丛志刚 (NCNSCC0C102)", value: "NCNSCC0C102", name: "丛志刚" },
    { label: "刘晓玉 (NCNSCC0C103)", value: "NCNSCC0C103", name: "刘晓玉" },
  ];

  const filterRepOptions = () => {
    if (!actorRole || !actorCode) return [];
    if (actorRole === "MR") {
      const self = mockRepOptions.find((r) => r.value === actorCode);
      return self ? [self] : [];
    }
    // DSM / RSM / BISO等：放开全部 mock 列表
    return mockRepOptions;
  };

  useEffect(() => {
    // 若本地已有存储则尝试恢复
    if (email) {
      handleMockLogin(email, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMockLogin = async (targetEmail: string, silent = false) => {
    if (!targetEmail) {
      message.warning("请输入邮箱");
      return;
    }
    try {
      setLoadingLogin(true);
      const res = await apiClient.get("/auth/mock-login", { params: { email: targetEmail } });
      const data = res.data;
      if (!data.actorCode || !data.actorRole) {
        message.warning("未找到映射，请确认邮箱是否已导入");
      } else {
        setActorCode(data.actorCode);
        setActorRole(data.actorRole);
        setAuthHeaders(data.actorCode, data.actorRole, targetEmail);
        localStorage.setItem("mockEmail", targetEmail);
        if (!silent) {
          message.success(`登录成功：${data.actorRole} / ${data.actorCode}`);
        }
      }
    } catch (err) {
      console.error(err);
      message.error("登录失败，请检查后台服务");
    } finally {
      setLoadingLogin(false);
    }
  };

  const fetchWorkflows = async () => {
    setLoadingList(true);
    try {
      const res = await apiClient.get("/workflows");
      setWorkflows(res.data || []);
      message.success(`已获取 ${res.data?.length ?? 0} 条流程`);
    } catch (err) {
      console.error(err);
      message.error("获取流程列表失败，请检查鉴权/服务");
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const values = await createForm.validateFields();
      let payload = {};
      if (values.payloadText) {
        payload = JSON.parse(values.payloadText);
      }
      setLoadingCreate(true);
      const res = await apiClient.post("/workflows", {
        type: values.type,
        title: values.title,
        payload,
        submittedBy: actorCode,
      });
      message.success(`创建成功，ID: ${res.data.id}`);
      fetchWorkflows();
    } catch (err: any) {
      if (err?.message?.includes("Unexpected token")) {
        message.error("payload 不是有效的 JSON");
      } else {
        console.error(err);
        message.error("创建失败，请检查参数/权限");
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleCreateNewHospital = async () => {
    try {
      const values = await newHospitalForm.validateFields();
      const payload = {
        institutionName: values.institutionName,
        institutionAddress: values.institutionAddress,
        repName: values.repName,
        repCode: values.repCode,
        reason: values.reason,
      };
      setLoadingNewHospital(true);
      const res = await apiClient.post("/workflows", {
        type: "NEW_TARGET_HOSPITAL",
        title: values.title || "",
        payload,
        submittedBy: actorCode,
      });
      const wfId = res.data?.id;
      // 如果填写了附件元信息，则顺带记录附件
      if (wfId && values.filename) {
        await apiClient.post(`/workflows/${wfId}/attachments`, {
          filename: values.filename,
          url: values.url || null,
          mimeType: values.mimeType || "image/jpeg",
        });
      }
      message.success(`新增目标医院已创建，ID: ${wfId || "-"}`);
      fetchWorkflows();
    } catch (err: any) {
      console.error(err);
      message.error("创建失败，请检查必填项或权限");
    } finally {
      setLoadingNewHospital(false);
    }
  };

  const handleAction = async () => {
    try {
      const values = await actionForm.validateFields();
      setLoadingAction(true);
      await apiClient.post(`/workflows/${values.workflowId}/actions`, {
        action: values.action,
        comment: values.comment,
        role: actorRole,
      });
      message.success(`动作 ${values.action} 已提交`);
      fetchWorkflows();
    } catch (err) {
      console.error(err);
      message.error("动作提交失败，请检查节点/权限");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAttachment = async () => {
    try {
      const values = await attachForm.validateFields();
      setLoadingAttachment(true);
      await apiClient.post(`/workflows/${values.workflowId}/attachments`, {
        stepId: values.stepId || null,
        filename: values.filename,
        url: values.url,
        mimeType: values.mimeType,
      });
      message.success("附件已记录");
    } catch (err) {
      console.error(err);
      message.error("上传附件失败");
    } finally {
      setLoadingAttachment(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        目标医院 & 药房审批系统（PC）
      </Header>
      <Layout>
        <Sider width={220} style={{ background: "#fff", borderRight: "1px solid #eee" }}>
          <Menu mode="inline" defaultSelectedKeys={["workflows"]} items={menuItems} />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Flex vertical gap={12}>
            <Card title="模拟登录（邮箱 → actorCode/actorRole）">
              <Space>
                <Input
                  placeholder="输入企业邮箱，例如 yao.liu@neurogen.com.cn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: 360 }}
                />
                <Button type="primary" loading={loadingLogin} onClick={() => handleMockLogin(email)}>
                  登录并注入 header
                </Button>
                {actorCode && actorRole ? (
                  <Tag color="blue">
                    {actorRole} / {actorCode}
                  </Tag>
                ) : (
                  <Tag>未登录</Tag>
                )}
              </Space>
            </Card>

            <Card title="快捷操作">
              <Space>
                <Button type="default" loading={loadingList} onClick={fetchWorkflows}>
                  拉取流程列表
                </Button>
              </Space>
            </Card>

            <Card title="流程动作（提交/审批等）">
              <Form form={actionForm} layout="vertical">
                <Form.Item
                  label="流程 ID"
                  name="workflowId"
                  rules={[{ required: true, message: "请输入流程ID" }]}
                >
                  <Input placeholder="wf id" />
                </Form.Item>
                <Form.Item
                  label="动作"
                  name="action"
                  rules={[{ required: true, message: "请选择动作" }]}
                >
                  <Select
                    options={[
                      { label: "提交", value: "SUBMIT" },
                      { label: "同意", value: "APPROVE" },
                      { label: "驳回", value: "REJECT" },
                      { label: "退回", value: "RETURN" },
                      { label: "撤回", value: "WITHDRAW" },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="备注" name="comment">
                  <Input.TextArea rows={2} placeholder="可选" />
                </Form.Item>
                <Space>
                  <Button type="primary" loading={loadingAction} onClick={handleAction}>
                    提交动作
                  </Button>
                  <Tag>当前角色: {actorRole || "未登录"}</Tag>
                </Space>
              </Form>
            </Card>

            <Card title="新增目标医院（正式表单字段）">
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="指派代表需在提交人权限范围内；代表岗位号自动或手动填写。附件支持 JPG/PNG（记录元信息）。"
              />
              <Form form={newHospitalForm} layout="vertical">
                <Form.Item
                  label="流程类型"
                  name="fixedType"
                  initialValue="NEW_TARGET_HOSPITAL"
                  rules={[{ required: true }]}
                >
                  <Select
                    disabled
                    options={[{ label: "新增目标医院", value: "NEW_TARGET_HOSPITAL" }]}
                  />
                </Form.Item>
                <Form.Item
                  label="机构名称"
                  name="institutionName"
                  rules={[{ required: true, message: "请输入机构名称" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="机构地址"
                  name="institutionAddress"
                  rules={[{ required: true, message: "请输入机构地址" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item label="标题" name="title">
                  <Input placeholder="可选" />
                </Form.Item>
                <Form.Item
                  label="指派代表姓名"
                  name="repName"
                  rules={[{ required: true, message: "请选择/填写代表姓名" }]}
                >
                  <Select
                    placeholder="当前权限范围内的代表"
                    options={filterRepOptions()}
                    showSearch
                    optionFilterProp="label"
                    onChange={(val) => {
                      const rep = mockRepOptions.find((r) => r.value === val);
                      if (rep) {
                        newHospitalForm.setFieldsValue({
                          repCode: rep.value,
                          repName: rep.name,
                        });
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item
                  label="代表岗位号"
                  name="repCode"
                  rules={[{ required: true, message: "请输入代表岗位号" }]}
                >
                  <Input placeholder="选择代表后自动带出" readOnly />
                </Form.Item>
                <Form.Item
                  label="新增理由"
                  name="reason"
                  rules={[{ required: true, message: "请输入新增理由" }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Divider>证明凭证（可选，记录元信息）</Divider>
                <Form.Item label="文件名" name="filename">
                  <Input placeholder="例如 proof.jpg" />
                </Form.Item>
                <Form.Item label="URL" name="url">
                  <Input placeholder="可选：http://..." />
                </Form.Item>
                <Form.Item label="MIME类型" name="mimeType" initialValue="image/jpeg">
                  <Input placeholder="image/jpeg 或 image/png" />
                </Form.Item>
                <Space>
                  <Button type="primary" loading={loadingNewHospital} onClick={handleCreateNewHospital}>
                    创建目标医院
                  </Button>
                  <Tag>提交人: {actorCode || "未登录"}</Tag>
                  <Tag>角色: {actorRole || "未登录"}</Tag>
                </Space>
              </Form>
            </Card>

            <Card title="其他流程（仍用 JSON 联调）">
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="除新增目标医院外，其他流程可用 JSON 方式创建；submittedBy 自动使用当前 actorCode。"
              />
              <Form
                form={createForm}
                layout="vertical"
                initialValues={{ type: "CANCEL_TARGET_HOSPITAL", payloadText: "{}" }}
                onValuesChange={(changed) => {
                  if (changed.type) setCreateType(changed.type);
                }}
              >
                <Form.Item label="流程类型" name="type" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { label: "取消目标医院", value: "CANCEL_TARGET_HOSPITAL" },
                      { label: "新增关联药房", value: "NEW_LINK_PHARMACY" },
                      { label: "取消关联药房", value: "CANCEL_LINK_PHARMACY" },
                      { label: "区域调整", value: "REGION_ADJUSTMENT" },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="标题" name="title">
                  <Input placeholder="可选" />
                </Form.Item>
                <Form.Item
                  label="payload (JSON)"
                  name="payloadText"
                  rules={[{ required: true, message: "请输入 JSON" }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder='例如 {"reason":"测试","distributions":[{"targetHospitalCode":"H1","sharePercent":100}]}'
                  />
                </Form.Item>
                <Space>
                  <Button type="primary" loading={loadingCreate} onClick={handleCreateWorkflow}>
                    创建流程
                  </Button>
                  <Tag>当前提交人: {actorCode || "未登录"}</Tag>
                  <Tag>选择类型: {createType}</Tag>
                </Space>
              </Form>
            </Card>

            <Card title="附件记录（C&D 审批需先上传附件）">
              <Form form={attachForm} layout="vertical">
                <Form.Item
                  label="流程 ID"
                  name="workflowId"
                  rules={[{ required: true, message: "请输入流程ID" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item label="步骤 ID（可选）" name="stepId">
                  <Input />
                </Form.Item>
                <Form.Item
                  label="文件名"
                  name="filename"
                  rules={[{ required: true, message: "请输入文件名" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item label="URL" name="url">
                  <Input placeholder="http://..." />
                </Form.Item>
                <Form.Item label="MIME类型" name="mimeType">
                  <Input placeholder="image/jpeg 或其他" />
                </Form.Item>
                <Button type="default" loading={loadingAttachment} onClick={handleAttachment}>
                  记录附件
                </Button>
              </Form>
            </Card>

            <Card title="流程列表（占位展示）">
              <List
                bordered
                dataSource={workflows}
                renderItem={(item: any) => (
                  <List.Item>
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong>
                        {item.type} / {item.status}
                      </Typography.Text>
                      <Typography.Text type="secondary">ID: {item.id}</Typography.Text>
                      <Typography.Text type="secondary">
                        提交人: {item.submittedBy || "-"}，创建: {item.createdAt}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
                locale={{ emptyText: "暂无数据，先创建或检查鉴权" }}
              />
            </Card>

            <Typography.Paragraph type="secondary">
              提示：当前为联调占位界面，通过 /auth/mock-login 获得 actorCode/actorRole 并写入请求头，
              后续接入企业微信后替换为真实登录。
            </Typography.Paragraph>
          </Flex>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
