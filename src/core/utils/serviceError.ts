import { ServiceErrorName } from '../data/core.data';

export class ServiceError extends Error {
  constructor(errorData: { status: number; message: string; error?: Error }) {
    super();
    this.message = JSON.stringify(errorData);
    this.name = ServiceErrorName;
  }
}
