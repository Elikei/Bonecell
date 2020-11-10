export interface ICallIn {
  eventId: string;
  val: string;
  uid: string;
  phone: string;
  transactionId: string;
  source: string;
  businessId?: string;
}

export interface ICallOut {}

export interface IAuthorizationIn {
  uid: string;
  phone: string;
  source?: string;
  businessId?: string;
  redirectNo?: boolean;
}

export interface IAuthorizationOut {}

export interface ILoginIn {
  uid: string;
  phone: string;
  source?: string;
  businessId?: string;
}

export interface ILoginOut {}
