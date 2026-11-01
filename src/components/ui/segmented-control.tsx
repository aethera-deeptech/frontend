import * as RadioGroup from '@radix-ui/react-radio-group';

export interface Segment {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  // The name for assistive technology, for example "Periode"
  label: string;
  segments: Segment[];
  value: string;
  onValueChange: (value: string) => void;
}

// Two or three choices of which one is always picked. It is a radio group, so the arrow keys move the choice.
export function SegmentedControl({ label, segments, value, onValueChange }: SegmentedControlProps) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className="bg-bg-3 flex gap-1 rounded-lg p-1"
    >
      {segments.map((segment) => (
        <RadioGroup.Item
          key={segment.value}
          value={segment.value}
          className="text-button text-text-2 data-[state=checked]:bg-bg-1 data-[state=checked]:border-border-1 data-[state=checked]:text-text-heading h-11 flex-1 rounded-md border border-transparent px-3"
        >
          {segment.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
