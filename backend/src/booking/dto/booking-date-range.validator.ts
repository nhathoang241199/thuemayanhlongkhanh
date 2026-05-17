import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsEndBookingAfterStart(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEndBookingAfterStart',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as {
            startBookingDate?: string;
            endBookingDate?: string;
          };
          if (!obj.startBookingDate || !obj.endBookingDate) return true;
          return (
            new Date(obj.endBookingDate).getTime() >=
            new Date(obj.startBookingDate).getTime()
          );
        },
        defaultMessage: () =>
          'endBookingDate phải lớn hơn hoặc bằng startBookingDate',
      },
    });
  };
}
