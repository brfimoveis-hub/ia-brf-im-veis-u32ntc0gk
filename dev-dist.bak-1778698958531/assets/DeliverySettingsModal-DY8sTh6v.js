import { C as useComposedRefs, D as require_react, T as useToast, b as createContextScope, f as Presence, h as Primitive, k as __toESM, r as Button, s as cn, t as pb, w as composeEventHandlers, x as require_jsx_runtime } from "./client-CVWO68xh.js";
import { S as useControllableState, a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-D1OGDVgL.js";
import { N as Check, _ as Label, b as Input, h as useAuth, v as Switch, x as useSize, y as usePrevious } from "./index-B-lyNKbh.js";
//#region ../../cache/modules/ia-uazapi-6d79e/node_modules/.pnpm/@radix-ui+react-checkbox@1.3.3_@types+react-dom@19.2.3_@types+react@19.2.14__@types+rea_a9bfe74df417688e01ae6068318bf0dd/node_modules/@radix-ui/react-checkbox/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CHECKBOX_NAME = "Checkbox";
var [createCheckboxContext, createCheckboxScope] = createContextScope(CHECKBOX_NAME);
var [CheckboxProviderImpl, useCheckboxContext] = createCheckboxContext(CHECKBOX_NAME);
function CheckboxProvider(props) {
	const { __scopeCheckbox, checked: checkedProp, children, defaultChecked, disabled, form, name, onCheckedChange, required, value = "on", internal_do_not_use_render } = props;
	const [checked, setChecked] = useControllableState({
		prop: checkedProp,
		defaultProp: defaultChecked ?? false,
		onChange: onCheckedChange,
		caller: CHECKBOX_NAME
	});
	const [control, setControl] = import_react.useState(null);
	const [bubbleInput, setBubbleInput] = import_react.useState(null);
	const hasConsumerStoppedPropagationRef = import_react.useRef(false);
	const isFormControl = control ? !!form || !!control.closest("form") : true;
	const context = {
		checked,
		disabled,
		setChecked,
		control,
		setControl,
		name,
		form,
		value,
		hasConsumerStoppedPropagationRef,
		required,
		defaultChecked: isIndeterminate(defaultChecked) ? false : defaultChecked,
		isFormControl,
		bubbleInput,
		setBubbleInput
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxProviderImpl, {
		scope: __scopeCheckbox,
		...context,
		children: isFunction(internal_do_not_use_render) ? internal_do_not_use_render(context) : children
	});
}
var TRIGGER_NAME = "CheckboxTrigger";
var CheckboxTrigger = import_react.forwardRef(({ __scopeCheckbox, onKeyDown, onClick, ...checkboxProps }, forwardedRef) => {
	const { control, value, disabled, checked, required, setControl, setChecked, hasConsumerStoppedPropagationRef, isFormControl, bubbleInput } = useCheckboxContext(TRIGGER_NAME, __scopeCheckbox);
	const composedRefs = useComposedRefs(forwardedRef, setControl);
	const initialCheckedStateRef = import_react.useRef(checked);
	import_react.useEffect(() => {
		const form = control?.form;
		if (form) {
			const reset = () => setChecked(initialCheckedStateRef.current);
			form.addEventListener("reset", reset);
			return () => form.removeEventListener("reset", reset);
		}
	}, [control, setChecked]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
		type: "button",
		role: "checkbox",
		"aria-checked": isIndeterminate(checked) ? "mixed" : checked,
		"aria-required": required,
		"data-state": getState(checked),
		"data-disabled": disabled ? "" : void 0,
		disabled,
		value,
		...checkboxProps,
		ref: composedRefs,
		onKeyDown: composeEventHandlers(onKeyDown, (event) => {
			if (event.key === "Enter") event.preventDefault();
		}),
		onClick: composeEventHandlers(onClick, (event) => {
			setChecked((prevChecked) => isIndeterminate(prevChecked) ? true : !prevChecked);
			if (bubbleInput && isFormControl) {
				hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
				if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
			}
		})
	});
});
CheckboxTrigger.displayName = TRIGGER_NAME;
var Checkbox$1 = import_react.forwardRef((props, forwardedRef) => {
	const { __scopeCheckbox, name, checked, defaultChecked, required, disabled, value, onCheckedChange, form, ...checkboxProps } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxProvider, {
		__scopeCheckbox,
		checked,
		defaultChecked,
		disabled,
		required,
		onCheckedChange,
		name,
		form,
		value,
		internal_do_not_use_render: ({ isFormControl }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxTrigger, {
			...checkboxProps,
			ref: forwardedRef,
			__scopeCheckbox
		}), isFormControl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxBubbleInput, { __scopeCheckbox })] })
	});
});
Checkbox$1.displayName = CHECKBOX_NAME;
var INDICATOR_NAME = "CheckboxIndicator";
var CheckboxIndicator = import_react.forwardRef((props, forwardedRef) => {
	const { __scopeCheckbox, forceMount, ...indicatorProps } = props;
	const context = useCheckboxContext(INDICATOR_NAME, __scopeCheckbox);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
		present: forceMount || isIndeterminate(context.checked) || context.checked === true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.span, {
			"data-state": getState(context.checked),
			"data-disabled": context.disabled ? "" : void 0,
			...indicatorProps,
			ref: forwardedRef,
			style: {
				pointerEvents: "none",
				...props.style
			}
		})
	});
});
CheckboxIndicator.displayName = INDICATOR_NAME;
var BUBBLE_INPUT_NAME = "CheckboxBubbleInput";
var CheckboxBubbleInput = import_react.forwardRef(({ __scopeCheckbox, ...props }, forwardedRef) => {
	const { control, hasConsumerStoppedPropagationRef, checked, defaultChecked, required, disabled, name, value, form, bubbleInput, setBubbleInput } = useCheckboxContext(BUBBLE_INPUT_NAME, __scopeCheckbox);
	const composedRefs = useComposedRefs(forwardedRef, setBubbleInput);
	const prevChecked = usePrevious(checked);
	const controlSize = useSize(control);
	import_react.useEffect(() => {
		const input = bubbleInput;
		if (!input) return;
		const inputProto = window.HTMLInputElement.prototype;
		const setChecked = Object.getOwnPropertyDescriptor(inputProto, "checked").set;
		const bubbles = !hasConsumerStoppedPropagationRef.current;
		if (prevChecked !== checked && setChecked) {
			const event = new Event("click", { bubbles });
			input.indeterminate = isIndeterminate(checked);
			setChecked.call(input, isIndeterminate(checked) ? false : checked);
			input.dispatchEvent(event);
		}
	}, [
		bubbleInput,
		prevChecked,
		checked,
		hasConsumerStoppedPropagationRef
	]);
	const defaultCheckedRef = import_react.useRef(isIndeterminate(checked) ? false : checked);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.input, {
		type: "checkbox",
		"aria-hidden": true,
		defaultChecked: defaultChecked ?? defaultCheckedRef.current,
		required,
		disabled,
		name,
		value,
		form,
		...props,
		tabIndex: -1,
		ref: composedRefs,
		style: {
			...props.style,
			...controlSize,
			position: "absolute",
			pointerEvents: "none",
			opacity: 0,
			margin: 0,
			transform: "translateX(-100%)"
		}
	});
});
CheckboxBubbleInput.displayName = BUBBLE_INPUT_NAME;
function isFunction(value) {
	return typeof value === "function";
}
function isIndeterminate(checked) {
	return checked === "indeterminate";
}
function getState(checked) {
	return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
//#endregion
//#region src/components/ui/checkbox.tsx
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	"data-uid": "src/components/ui/checkbox.tsx:12:3",
	"data-prohibitions": "[editContent]",
	ref,
	className: cn("peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		"data-uid": "src/components/ui/checkbox.tsx:20:5",
		"data-prohibitions": "[editContent]",
		className: cn("flex items-center justify-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
			"data-uid": "src/components/ui/checkbox.tsx:21:7",
			"data-prohibitions": "[editContent]",
			className: "h-4 w-4"
		})
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
//#endregion
//#region src/components/customers/DeliverySettingsModal.tsx
var DAYS = [
	{
		id: "monday",
		label: "Segunda-feira"
	},
	{
		id: "tuesday",
		label: "Terça-feira"
	},
	{
		id: "wednesday",
		label: "Quarta-feira"
	},
	{
		id: "thursday",
		label: "Quinta-feira"
	},
	{
		id: "friday",
		label: "Sexta-feira"
	},
	{
		id: "saturday",
		label: "Sábado"
	},
	{
		id: "sunday",
		label: "Domingo"
	}
];
function DeliverySettingsModal({ open, onOpenChange }) {
	const { user } = useAuth();
	const { toast } = useToast();
	const [enabled, setEnabled] = (0, import_react.useState)(true);
	const [startTime, setStartTime] = (0, import_react.useState)("08:00");
	const [endTime, setEndTime] = (0, import_react.useState)("18:00");
	const [interval, setInterval] = (0, import_react.useState)(5);
	const [days, setDays] = (0, import_react.useState)([
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday"
	]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (user && open) {
			setEnabled(user.delivery_enabled ?? true);
			setStartTime(user.delivery_start_time || "08:00");
			setEndTime(user.delivery_end_time || "18:00");
			setInterval(user.delivery_interval ?? 5);
			setDays(user.delivery_days || [
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday"
			]);
		}
	}, [user, open]);
	const handleSave = async () => {
		if (startTime >= endTime) {
			toast({
				title: "Horário inválido",
				description: "O horário de início deve ser anterior ao de término.",
				variant: "destructive"
			});
			return;
		}
		if (!user) return;
		setLoading(true);
		try {
			await pb.collection("users").update(user.id, {
				delivery_enabled: enabled,
				delivery_start_time: startTime,
				delivery_end_time: endTime,
				delivery_interval: interval,
				delivery_days: days
			});
			toast({ title: "Configurações salvas com sucesso" });
			onOpenChange(false);
		} catch (err) {
			toast({
				title: "Erro ao salvar",
				description: err.message,
				variant: "destructive"
			});
		} finally {
			setLoading(false);
		}
	};
	const toggleDay = (dayId) => {
		setDays((prev) => prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		"data-uid": "src/components/customers/DeliverySettingsModal.tsx:95:5",
		"data-prohibitions": "[editContent]",
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			"data-uid": "src/components/customers/DeliverySettingsModal.tsx:96:7",
			"data-prohibitions": "[editContent]",
			className: "max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
					"data-uid": "src/components/customers/DeliverySettingsModal.tsx:97:9",
					"data-prohibitions": "[]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						"data-uid": "src/components/customers/DeliverySettingsModal.tsx:98:11",
						"data-prohibitions": "[]",
						children: "Configurações de Envio"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
						"data-uid": "src/components/customers/DeliverySettingsModal.tsx:99:11",
						"data-prohibitions": "[]",
						children: "Controle os horários e o intervalo das mensagens automáticas para manter um fluxo natural."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					"data-uid": "src/components/customers/DeliverySettingsModal.tsx:105:9",
					"data-prohibitions": "[editContent]",
					className: "space-y-6 py-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/DeliverySettingsModal.tsx:106:11",
							"data-prohibitions": "[]",
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:107:13",
								"data-prohibitions": "[]",
								className: "space-y-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:108:15",
									"data-prohibitions": "[]",
									children: "Envio Automático Ativo"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:109:15",
									"data-prohibitions": "[]",
									className: "text-sm text-muted-foreground",
									children: "Permitir envios da IA globalmente."
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:113:13",
								"data-prohibitions": "[editContent]",
								checked: enabled,
								onCheckedChange: setEnabled
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/DeliverySettingsModal.tsx:116:11",
							"data-prohibitions": "[]",
							className: "grid grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:117:13",
								"data-prohibitions": "[]",
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:118:15",
									"data-prohibitions": "[]",
									children: "Horário de Início"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:119:15",
									"data-prohibitions": "[editContent]",
									type: "time",
									value: startTime,
									onChange: (e) => setStartTime(e.target.value)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:121:13",
								"data-prohibitions": "[]",
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:122:15",
									"data-prohibitions": "[]",
									children: "Horário de Término"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:123:15",
									"data-prohibitions": "[editContent]",
									type: "time",
									value: endTime,
									onChange: (e) => setEndTime(e.target.value)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/DeliverySettingsModal.tsx:127:11",
							"data-prohibitions": "[]",
							className: "space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:128:13",
									"data-prohibitions": "[]",
									children: "Intervalo Mínimo (minutos)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:129:13",
									"data-prohibitions": "[editContent]",
									type: "number",
									min: 0,
									value: interval,
									onChange: (e) => setInterval(parseInt(e.target.value))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:135:13",
									"data-prohibitions": "[]",
									className: "text-xs text-muted-foreground",
									children: "Tempo de espera entre envios sucessivos."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-uid": "src/components/customers/DeliverySettingsModal.tsx:140:11",
							"data-prohibitions": "[editContent]",
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:141:13",
								"data-prohibitions": "[]",
								children: "Dias de Envio"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"data-uid": "src/components/customers/DeliverySettingsModal.tsx:142:13",
								"data-prohibitions": "[editContent]",
								className: "grid grid-cols-2 gap-3",
								children: DAYS.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									"data-uid": "src/components/customers/DeliverySettingsModal.tsx:144:17",
									"data-prohibitions": "[editContent]",
									className: "flex items-center space-x-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										"data-uid": "src/components/customers/DeliverySettingsModal.tsx:145:19",
										"data-prohibitions": "[editContent]",
										id: `day-${day.id}`,
										checked: days.includes(day.id),
										onCheckedChange: () => toggleDay(day.id)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										"data-uid": "src/components/customers/DeliverySettingsModal.tsx:150:19",
										"data-prohibitions": "[editContent]",
										htmlFor: `day-${day.id}`,
										className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
										children: day.label
									})]
								}, day.id))
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					"data-uid": "src/components/customers/DeliverySettingsModal.tsx:162:9",
					"data-prohibitions": "[]",
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						"data-uid": "src/components/customers/DeliverySettingsModal.tsx:163:11",
						"data-prohibitions": "[]",
						variant: "outline",
						onClick: () => onOpenChange(false),
						children: "Cancelar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						"data-uid": "src/components/customers/DeliverySettingsModal.tsx:166:11",
						"data-prohibitions": "[]",
						onClick: handleSave,
						disabled: loading,
						children: "Salvar"
					})]
				})
			]
		})
	});
}
//#endregion
export { DeliverySettingsModal };

//# sourceMappingURL=DeliverySettingsModal-DY8sTh6v.js.map