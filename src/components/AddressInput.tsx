import { UseFormRegister, FieldValues, UseFormWatch, FieldErrors, FieldPath } from 'react-hook-form';

interface AddressInputProps<T extends FieldValues> {
  fieldNamePrefix: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  watch: UseFormWatch<T>;
  optional?: boolean;
}

const label = (text: string, required = false) => (
  <label className="label">
    {text}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const resolveFieldName = <T extends FieldValues>(
  fieldNamePrefix: string,
  field: 'line1' | 'line2' | 'city' | 'state' | 'zip'
): FieldPath<T> => {
  if (field === 'city') {
    return (fieldNamePrefix === 'address' ? 'city' : `${fieldNamePrefix}City`) as FieldPath<T>;
  }
  if (field === 'state') {
    return (fieldNamePrefix === 'address' ? 'state' : `${fieldNamePrefix}State`) as FieldPath<T>;
  }
  if (field === 'zip') {
    return (fieldNamePrefix === 'address' ? 'zip' : `${fieldNamePrefix}Zip`) as FieldPath<T>;
  }

  return `${fieldNamePrefix}${field === 'line1' ? 'Line1' : 'Line2'}` as FieldPath<T>;
};

export default function AddressInput<T extends FieldValues>({
  fieldNamePrefix,
  register,
  errors,
  watch,
  optional = false,
}: AddressInputProps<T>) {
  void watch;

  const fieldNames = {
    line1: resolveFieldName<T>(fieldNamePrefix, 'line1'),
    line2: resolveFieldName<T>(fieldNamePrefix, 'line2'),
    city: resolveFieldName<T>(fieldNamePrefix, 'city'),
    state: resolveFieldName<T>(fieldNamePrefix, 'state'),
    zip: resolveFieldName<T>(fieldNamePrefix, 'zip'),
  };

  const getFieldError = (fieldName: FieldPath<T>) =>
    errors[fieldName as keyof FieldErrors<T>] as { message?: unknown } | undefined;

  return (
    <>
      {/* Address Line 1 */}
      <div className="xl:col-span-2">
        {label('Address Line 1', !optional)}
        <input
          className="input-field"
          placeholder="Street address"
          {...register(fieldNames.line1, {
            ...(optional ? {} : { required: 'Address Line 1 is required' }),
            minLength: { value: 3, message: 'Minimum 3 characters' },
            maxLength: { value: 255, message: 'Maximum 255 characters' },
            pattern: {
              value: /^[A-Za-z0-9\s.,#-]*$/,
              message: 'Invalid address format',
            },
          })}
        />
        {getFieldError(fieldNames.line1) && (
          <p className="text-xs text-red-600 mt-1">{String(getFieldError(fieldNames.line1)?.message)}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div className="xl:col-span-2">
        {label('Address Line 2')}
        <input
          className="input-field"
          placeholder="Apartment, suite, etc. (optional)"
          {...register(fieldNames.line2, {
            maxLength: { value: 255, message: 'Maximum 255 characters' },
            pattern: {
              value: /^[A-Za-z0-9\s.,#-]*$/,
              message: 'Invalid format',
            },
          })}
        />
        {getFieldError(fieldNames.line2) && (
          <p className="text-xs text-red-600 mt-1">{String(getFieldError(fieldNames.line2)?.message)}</p>
        )}
      </div>

      {/* State */}
      <div>
        {label('State', !optional)}
        <input
          className="input-field"
          placeholder="State code"
          {...register(fieldNames.state, {
            ...(optional ? {} : { required: 'State is required' }),
            maxLength: { value: 10, message: 'Maximum 10 characters' },
          })}
        />
        {getFieldError(fieldNames.state) && (
          <p className="text-xs text-red-600 mt-1">{String(getFieldError(fieldNames.state)?.message)}</p>
        )}
      </div>

      {/* City */}
      <div>
        {label('City', !optional)}
        <input
          className="input-field"
          placeholder="City"
          {...register(fieldNames.city, {
            ...(optional ? {} : { required: 'City is required' }),
            maxLength: { value: 120, message: 'Maximum 120 characters' },
          })}
        />
        {getFieldError(fieldNames.city) && (
          <p className="text-xs text-red-600 mt-1">{String(getFieldError(fieldNames.city)?.message)}</p>
        )}
      </div>

      {/* Zip Code */}
      <div>
        {label('Zip Code', !optional)}
        <input
          className="input-field"
          placeholder="12345 or 12345-6789"
          {...register(fieldNames.zip, {
            ...(optional ? {} : { required: 'Zip Code is required' }),
            pattern: {
              value: /^\d{5}(\d{4})?$|^\d{5}-\d{4}$/,
              message: 'Enter a valid ZIP code (5 or 9 digits)',
            },
          })}
        />
        {getFieldError(fieldNames.zip) && (
          <p className="text-xs text-red-600 mt-1">{String(getFieldError(fieldNames.zip)?.message)}</p>
        )}
      </div>
    </>
  );
}
