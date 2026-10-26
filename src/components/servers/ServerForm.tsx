import { useEffect, useState, type FormEvent } from "react";

import { SSH_PORT_MAX, SSH_PORT_MIN } from "../../constants/layout";
import type { AuthType, ServerFormValues, SshServer } from "../../types";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

export interface ServerFormProps {
  open: boolean;
  /** 传入则为编辑模式 */
  server?: SshServer | null;
  onClose: () => void;
  onSubmit: (values: ServerFormValues) => void;
}

/** 表单初始值 */
function emptyValues(): ServerFormValues {
  return {
    name: "",
    host: "",
    port: 22,
    username: "",
    authType: "password",
    password: "",
    privateKeyPath: "",
    group: "",
    description: "",
  };
}

/** 由服务器实体回填表单 */
function toValues(server: SshServer): ServerFormValues {
  return {
    name: server.name,
    host: server.host,
    port: server.port,
    username: server.username,
    authType: server.authType,
    password: server.password ?? "",
    privateKeyPath: server.privateKeyPath ?? "",
    group: server.group ?? "",
    description: server.description ?? "",
  };
}

/** 表单校验，返回字段级错误 */
function validate(values: ServerFormValues): Partial<Record<keyof ServerFormValues, string>> {
  const errors: Partial<Record<keyof ServerFormValues, string>> = {};
  if (!values.name.trim()) errors.name = "请填写服务器名称";
  if (!values.host.trim()) errors.host = "请填写主机地址";
  if (!values.username.trim()) errors.username = "请填写用户名";
  if (
    !Number.isInteger(values.port) ||
    values.port < SSH_PORT_MIN ||
    values.port > SSH_PORT_MAX
  ) {
    errors.port = `端口需在 ${SSH_PORT_MIN}-${SSH_PORT_MAX} 之间`;
  }
  if (values.authType === "password" && !values.password) {
    errors.password = "请填写密码";
  }
  if (values.authType === "key" && !values.privateKeyPath.trim()) {
    errors.privateKeyPath = "请填写私钥路径";
  }
  return errors;
}

/** 服务器新增/编辑表单 */
export function ServerForm({
  open,
  server,
  onClose,
  onSubmit,
}: ServerFormProps) {
  const [values, setValues] = useState<ServerFormValues>(emptyValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ServerFormValues, string>>
  >({});

  // 打开时按模式初始化表单
  useEffect(() => {
    if (!open) return;
    setValues(server ? toValues(server) : emptyValues());
    setErrors({});
  }, [open, server]);

  const update = <K extends keyof ServerFormValues>(
    key: K,
    value: ServerFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  const fieldError = (key: keyof ServerFormValues) => errors[key];

  return (
    <Modal
      open={open}
      title={server ? `编辑服务器 · ${server.name}` : "添加服务器"}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {server ? "保存" : "添加"}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="server-name">
              名称
            </label>
            <input
              id="server-name"
              className={`form__input ${fieldError("name") ? "form__input--invalid" : ""}`.trim()}
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="例如：生产网关"
            />
            {fieldError("name") ? (
              <span className="form__error">{fieldError("name")}</span>
            ) : null}
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="server-group">
              分组
            </label>
            <input
              id="server-group"
              className="form__input"
              value={values.group}
              onChange={(event) => update("group", event.target.value)}
              placeholder="留空则归入未分组"
            />
          </div>
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="server-host">
              主机地址
            </label>
            <input
              id="server-host"
              className={`form__input ${fieldError("host") ? "form__input--invalid" : ""}`.trim()}
              value={values.host}
              onChange={(event) => update("host", event.target.value)}
              placeholder="10.20.0.11 或 bastion.corp.internal"
            />
            {fieldError("host") ? (
              <span className="form__error">{fieldError("host")}</span>
            ) : null}
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="server-port">
              端口
            </label>
            <input
              id="server-port"
              className={`form__input ${fieldError("port") ? "form__input--invalid" : ""}`.trim()}
              type="number"
              value={values.port}
              onChange={(event) =>
                update("port", Number.parseInt(event.target.value, 10) || 0)
              }
            />
            {fieldError("port") ? (
              <span className="form__error">{fieldError("port")}</span>
            ) : null}
          </div>
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="server-username">
              用户名
            </label>
            <input
              id="server-username"
              className={`form__input ${fieldError("username") ? "form__input--invalid" : ""}`.trim()}
              value={values.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder="deploy"
            />
            {fieldError("username") ? (
              <span className="form__error">{fieldError("username")}</span>
            ) : null}
          </div>
          <div className="form__field">
            <span className="form__label">认证方式</span>
            <div className="form__radio-group">
              <label className="form__radio">
                <input
                  type="radio"
                  checked={values.authType === "password"}
                  onChange={() => update("authType", "password" as AuthType)}
                />
                密码
              </label>
              <label className="form__radio">
                <input
                  type="radio"
                  checked={values.authType === "key"}
                  onChange={() => update("authType", "key" as AuthType)}
                />
                私钥
              </label>
            </div>
          </div>
        </div>

        {values.authType === "password" ? (
          <div className="form__field">
            <label className="form__label" htmlFor="server-password">
              密码
            </label>
            <input
              id="server-password"
              type="password"
              className={`form__input ${fieldError("password") ? "form__input--invalid" : ""}`.trim()}
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
            />
            {fieldError("password") ? (
              <span className="form__error">{fieldError("password")}</span>
            ) : (
              <p className="form__hint">
                本迭代的密码仅保存在内存中，不会落盘。
              </p>
            )}
          </div>
        ) : (
          <div className="form__field">
            <label className="form__label" htmlFor="server-key">
              私钥路径
            </label>
            <input
              id="server-key"
              className={`form__input ${fieldError("privateKeyPath") ? "form__input--invalid" : ""}`.trim()}
              value={values.privateKeyPath}
              onChange={(event) => update("privateKeyPath", event.target.value)}
              placeholder="~/.ssh/id_ed25519"
            />
            {fieldError("privateKeyPath") ? (
              <span className="form__error">{fieldError("privateKeyPath")}</span>
            ) : null}
          </div>
        )}

        <div className="form__field">
          <label className="form__label" htmlFor="server-desc">
            备注
          </label>
          <textarea
            id="server-desc"
            className="form__input form__textarea"
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="这台机器的用途、注意事项等"
          />
        </div>
      </form>
    </Modal>
  );
}
