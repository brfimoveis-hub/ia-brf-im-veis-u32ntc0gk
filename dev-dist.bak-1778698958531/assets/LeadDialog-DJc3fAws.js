import { D as require_react, T as useToast, k as __toESM, r as Button, x as require_jsx_runtime } from "./client-CVWO68xh.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-D1OGDVgL.js";
import { A as LoaderCircle, _ as Label, a as extractFieldErrors, b as Input, l as updateCustomer, o as createCustomer } from "./index-B-lyNKbh.js";
//#region src/components/customers/LeadDialog.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function LeadDialog({ open, onOpenChange, defaultValues }) {
	const [formData, setFormData] = (0, import_react.useState)({
		name: "",
		first_name: "",
		last_name: "",
		phone: "",
		email: "",
		status: "1"
	});
	const [errors, setErrors] = (0, import_react.useState)({});
	const [loading, setLoading] = (0, import_react.useState)(false);
	const { toast } = useToast();
	(0, import_react.useEffect)(() => {
		if (open) {
			setErrors({});
			if (defaultValues) setFormData({
				name: defaultValues.name || "",
				first_name: defaultValues.first_name || "",
				last_name: defaultValues.last_name || "",
				phone: defaultValues.phone || "",
				email: defaultValues.email || "",
				status: defaultValues.status || "1"
			});
			else setFormData({
				name: "",
				first_name: "",
				last_name: "",
				phone: "",
				email: "",
				status: "1"
			});
		}
	}, [defaultValues, open]);
	const handleFirstNameChange = (val) => {
		setFormData((prev) => {
			const prevConstructed = [prev.first_name, prev.last_name].filter(Boolean).join(" ").trim();
			const newConstructed = [val, prev.last_name].filter(Boolean).join(" ").trim();
			const isNameSyncing = !prev.name || prev.name === prevConstructed || prev.name.toLowerCase() === "sem nome";
			return {
				...prev,
				first_name: val,
				name: isNameSyncing ? newConstructed : prev.name
			};
		});
	};
	const handleLastNameChange = (val) => {
		setFormData((prev) => {
			const prevConstructed = [prev.first_name, prev.last_name].filter(Boolean).join(" ").trim();
			const newConstructed = [prev.first_name, val].filter(Boolean).join(" ").trim();
			const isNameSyncing = !prev.name || prev.name === prevConstructed || prev.name.toLowerCase() === "sem nome";
			return {
				...prev,
				last_name: val,
				name: isNameSyncing ? newConstructed : prev.name
			};
		});
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setErrors({});
		try {
			const dataToSubmit = {
				...formData,
				name: formData.name.trim()
			};
			if (!dataToSubmit.name) {
				const constructed = [dataToSubmit.first_name, dataToSubmit.last_name].filter(Boolean).join(" ").trim();
				if (constructed) dataToSubmit.name = constructed;
				else if (dataToSubmit.email) dataToSubmit.name = dataToSubmit.email;
				else if (dataToSubmit.phone) dataToSubmit.name = dataToSubmit.phone;
				else dataToSubmit.name = "Sem nome";
			}
			if (defaultValues?.id) {
				await updateCustomer(defaultValues.id, dataToSubmit);
				toast({ title: "Lead atualizado com sucesso!" });
			} else {
				await createCustomer({
					...dataToSubmit,
					tags: ["Manual"]
				});
				toast({ title: "Lead adicionado com sucesso!" });
			}
			onOpenChange(false);
		} catch (err) {
			const fieldErrors = extractFieldErrors(err);
			setErrors(fieldErrors);
			if (Object.keys(fieldErrors).length === 0) toast({
				title: "Erro ao salvar",
				variant: "destructive"
			});
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		"data-uid": "src/components/customers/LeadDialog.tsx:131:5",
		"data-prohibitions": "[editContent]",
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			"data-uid": "src/components/customers/LeadDialog.tsx:132:7",
			"data-prohibitions": "[editContent]",
			className: "sm:max-w-[425px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
				"data-uid": "src/components/customers/LeadDialog.tsx:133:9",
				"data-prohibitions": "[editContent]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					"data-uid": "src/components/customers/LeadDialog.tsx:134:11",
					"data-prohibitions": "[editContent]",
					children: defaultValues ? "Editar Lead" : "Adicionar Lead"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					"data-uid": "src/components/customers/LeadDialog.tsx:135:11",
					"data-prohibitions": "[editContent]",
					children: defaultValues ? "Atualize as informações do cliente." : "Preencha as informações do novo cliente."
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				"data-uid": "src/components/customers/LeadDialog.tsx:141:9",
				"data-prohibitions": "[editContent]",
				onSubmit: handleSubmit,
				className: "space-y-4 py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						"data-uid": "src/components/customers/LeadDialog.tsx:142:11",
						"data-prohibitions": "[]",
						className: "grid grid-cols-2 gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/LeadDialog.tsx:143:13",
							"data-prohibitions": "[]",
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/LeadDialog.tsx:144:15",
								"data-prohibitions": "[]",
								htmlFor: "first_name",
								children: "Nome (Primeiro)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								"data-uid": "src/components/customers/LeadDialog.tsx:145:15",
								"data-prohibitions": "[editContent]",
								id: "first_name",
								value: formData.first_name,
								onChange: (e) => handleFirstNameChange(e.target.value),
								placeholder: "Ex: João"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/LeadDialog.tsx:152:13",
							"data-prohibitions": "[]",
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/LeadDialog.tsx:153:15",
								"data-prohibitions": "[]",
								htmlFor: "last_name",
								children: "Sobrenome"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								"data-uid": "src/components/customers/LeadDialog.tsx:154:15",
								"data-prohibitions": "[editContent]",
								id: "last_name",
								value: formData.last_name,
								onChange: (e) => handleLastNameChange(e.target.value),
								placeholder: "Ex: da Silva"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						"data-uid": "src/components/customers/LeadDialog.tsx:162:11",
						"data-prohibitions": "[editContent]",
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/LeadDialog.tsx:163:13",
								"data-prohibitions": "[]",
								htmlFor: "name",
								children: "Nome Completo (Exibição) *"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								"data-uid": "src/components/customers/LeadDialog.tsx:164:13",
								"data-prohibitions": "[editContent]",
								id: "name",
								required: true,
								value: formData.name,
								onChange: (e) => setFormData({
									...formData,
									name: e.target.value
								}),
								placeholder: "Ex: João da Silva",
								className: errors.name ? "border-red-500" : ""
							}),
							errors.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								"data-uid": "src/components/customers/LeadDialog.tsx:172:29",
								"data-prohibitions": "[editContent]",
								className: "text-sm text-red-500",
								children: errors.name
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						"data-uid": "src/components/customers/LeadDialog.tsx:174:11",
						"data-prohibitions": "[editContent]",
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/LeadDialog.tsx:175:13",
								"data-prohibitions": "[]",
								htmlFor: "phone",
								children: "Telefone"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								"data-uid": "src/components/customers/LeadDialog.tsx:176:13",
								"data-prohibitions": "[editContent]",
								id: "phone",
								value: formData.phone,
								onChange: (e) => setFormData({
									...formData,
									phone: e.target.value
								}),
								placeholder: "Ex: +55 11 99999-9999",
								className: errors.phone ? "border-red-500" : ""
							}),
							errors.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								"data-uid": "src/components/customers/LeadDialog.tsx:183:30",
								"data-prohibitions": "[editContent]",
								className: "text-sm text-red-500",
								children: errors.phone
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						"data-uid": "src/components/customers/LeadDialog.tsx:185:11",
						"data-prohibitions": "[editContent]",
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/LeadDialog.tsx:186:13",
								"data-prohibitions": "[]",
								htmlFor: "email",
								children: "Email"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								"data-uid": "src/components/customers/LeadDialog.tsx:187:13",
								"data-prohibitions": "[editContent]",
								id: "email",
								type: "email",
								value: formData.email,
								onChange: (e) => setFormData({
									...formData,
									email: e.target.value
								}),
								placeholder: "Ex: joao@email.com",
								className: errors.email ? "border-red-500" : ""
							}),
							errors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								"data-uid": "src/components/customers/LeadDialog.tsx:195:30",
								"data-prohibitions": "[editContent]",
								className: "text-sm text-red-500",
								children: errors.email
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
						"data-uid": "src/components/customers/LeadDialog.tsx:197:11",
						"data-prohibitions": "[editContent]",
						className: "pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							"data-uid": "src/components/customers/LeadDialog.tsx:198:13",
							"data-prohibitions": "[]",
							type: "button",
							variant: "outline",
							onClick: () => onOpenChange(false),
							children: "Cancelar"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							"data-uid": "src/components/customers/LeadDialog.tsx:201:13",
							"data-prohibitions": "[editContent]",
							type: "submit",
							disabled: loading,
							children: [loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								"data-uid": "src/components/customers/LeadDialog.tsx:202:27",
								"data-prohibitions": "[editContent]",
								className: "mr-2 h-4 w-4 animate-spin"
							}), "Salvar"]
						})]
					})
				]
			})]
		})
	});
}
//#endregion
export { LeadDialog };

//# sourceMappingURL=LeadDialog-DJc3fAws.js.map