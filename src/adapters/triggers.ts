export interface TriggerService {
  getProjectTriggers(): GoogleAppsScript.Script.Trigger[];
  deleteTrigger(t: GoogleAppsScript.Script.Trigger): void;
  newTrigger(name: string): GoogleAppsScript.Script.TriggerBuilder;
}
export class Triggers {
  constructor(private service: TriggerService) {}
  remove() {
    this.service
      .getProjectTriggers()
      .filter((t) => t.getHandlerFunction() === 'tick')
      .forEach((t) => this.service.deleteTrigger(t));
  }
  ensure() {
    this.remove();
    this.service.newTrigger('tick').timeBased().everyMinutes(5).create();
  }
}
