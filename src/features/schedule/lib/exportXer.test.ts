import {describe,it,expect} from "vitest";
import {exportPrimaveraXer} from "./exportXer";
import type {Project} from "@/types/domain";
describe("subscription notice in Primavera export",()=>{
  it("marks the root description while preserving project codes, IDs and file structure",()=>{
    const project={id:"00000000-0000-0000-0000-000000000101",name:"اسم مشروع طويل لا يجب أن يفقد معرفه أو يصطدم بمشاريع أخرى ".repeat(3)} as Project;
    const normal=exportPrimaveraXer(project,[],{}).split("\n");
    const marked=exportPrimaveraXer(project,[],{},true).split("\n");
    expect(marked.length).toBe(normal.length);
    const changes=normal.map((row,i)=>row===marked[i]?null:{row,marked:marked[i]}).filter(Boolean);
    expect(changes).toHaveLength(1);
    const before=changes[0]!.row.split("\t"),after=changes[0]!.marked.split("\t");
    expect(before.length).toBe(after.length);
    const changed=before.map((cell,i)=>cell===after[i]?null:i).filter(i=>i!==null);
    expect(changed).toEqual([10]);
    expect(after[10]).toContain("انتهت الفترة التجريبية أو الاشتراك");
    expect(after[10].length).toBeLessThanOrEqual(100);
    expect(after[9]).toBe(before[9]);
  });
});
