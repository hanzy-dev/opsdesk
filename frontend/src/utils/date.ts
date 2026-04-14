const formatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string) {
  return formatter.format(new Date(value));
}
