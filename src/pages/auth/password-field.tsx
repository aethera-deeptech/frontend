import { useState, type ComponentProps } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { TextInput } from '@/components/ui/text-input';

type PasswordFieldProps = Omit<ComponentProps<typeof TextInput>, 'type'>;

// A password field with the checkbox that shows the text. The checkbox sits under the field, like the Figma frames.
export function PasswordField(props: PasswordFieldProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <TextInput {...props} type={shown ? 'text' : 'password'} />
      <Checkbox
        label="Tampilkan kata sandi"
        checked={shown}
        disabled={props.disabled}
        onCheckedChange={(checked) => {
          setShown(checked === true);
        }}
      />
    </div>
  );
}
