import { useEffect, useState } from "react";
import { Layout, Menu, Typography, Flex, Input, Button, Card, message, Space, Tag, List } from "antd";
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
