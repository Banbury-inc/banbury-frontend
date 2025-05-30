import * as net from "net";
import { SmallDeviceInfo, DeviceInfo } from "../types";


export async function sendSmallDeviceInfo(sender_socket: net.Socket, device_info: SmallDeviceInfo): Promise<void> {
  const file_header: string = "SMALL_PING_REQUEST_RESPONSE::::END_OF_HEADER";
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  const full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
}

export async function sendDeviceInfo(sender_socket: net.Socket, device_info: DeviceInfo): Promise<void> {
  const null_string: string = "";
  const file_header: string = `PING_REQUEST_RESPONSE:${null_string}:${null_string}:${null_string}:END_OF_HEADER`;
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  const full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
}


