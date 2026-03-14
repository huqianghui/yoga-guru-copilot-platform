import { cn } from "@/lib/utils";

interface BaseFieldProps {
  label: string;
  className?: string;
}

interface InputFieldProps extends BaseFieldProps {
  type: "input";
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  inputType?: string;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea";
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
}

type FormFieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps;

const fieldClass =
  "w-full px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/50 text-gray-800";

export function FormField(props: FormFieldProps) {
  return (
    <div className={cn("space-y-2", props.className)}>
      <label className="block text-sm font-medium text-gray-700">{props.label}</label>
      {props.type === "input" && (
        <input
          type={props.inputType || "text"}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          className={fieldClass}
        />
      )}
      {props.type === "select" && (
        <select
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          className={fieldClass}
        >
          {props.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {props.type === "textarea" && (
        <textarea
          placeholder={props.placeholder}
          rows={props.rows || 3}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
}
