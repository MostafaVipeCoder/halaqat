import { supabase } from '../lib/supabase';

export interface ScheduleSlot {
    id: string;
    school_id: string;
    class_id: string;
    teacher_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room: string | null;
    notes: string | null;
    classes?: { name: string; teacher_id: string | null; teacher_name: string | null } | null;
}

export type ScheduleSlotInput = Pick<ScheduleSlot, 'class_id' | 'teacher_id' | 'day_of_week' | 'start_time' | 'end_time' | 'room' | 'notes'>;

export const scheduleService = {
    async getAll() {
        const { data, error } = await supabase
            .from('class_schedules')
            .select('*, classes ( name, teacher_id, teacher_name )')
            .order('day_of_week')
            .order('start_time');
        if (error) throw error;
        return data as ScheduleSlot[];
    },

    async create(slots: ScheduleSlotInput[]) {
        const { error } = await supabase.from('class_schedules').insert(slots);
        if (error) throw error;
    },

    async update(id: string, slot: Partial<ScheduleSlotInput>) {
        const { error } = await supabase.from('class_schedules').update(slot).eq('id', id);
        if (error) throw error;
    },

    async delete(id: string) {
        const { error } = await supabase.from('class_schedules').delete().eq('id', id);
        if (error) throw error;
    },
};
