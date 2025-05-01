import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useValidatedForm(schema, defaultValues) {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues,
    });

    const onSubmit = form.handleSubmit(async (data) => {
        // Handle submission logic here
        console.log(data);  // Or pass to a callback
    });

    return { ...form, onSubmit };
} 