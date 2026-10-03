import { Field, FieldProps, Form, Formik, FormikHelpers } from 'formik';

import { Button, Input, Text } from '@deriv-com/ui';

export const getSocketURL = () => {
    const local_storage_server_url = window.localStorage.getItem('config.server_url');
    if (local_storage_server_url) return local_storage_server_url;

    let active_loginid_from_url;
    const search = window.location.search;
    if (search) {
        const params = new URLSearchParams(document.location.search.substring(1));
        active_loginid_from_url = params.get('acct1');
    }

    const loginid = window.localStorage.getItem('active_loginid') ?? active_loginid_from_url;
    const is_real = loginid && !/^(VRT|VRW)/.test(loginid);

    const server = is_real ? 'green' : 'blue';
    const server_url = `${server}.derivws.com`;

    return server_url;
};

const DEFAULT_APP_ID = '33UD5Xga7WHSzXFtBYdmr';

interface EndpointProps {
    app_id: string;
    server: string;
}

export const Endpoint = () => {
    return (
        <Formik<EndpointProps>
            initialValues={{
                app_id: localStorage.getItem('config.app_id') || DEFAULT_APP_ID,
                server: getSocketURL(),
            }}
            validate={(values: EndpointProps) => {
                const errors: Partial<EndpointProps> = {};

                if (!values.app_id) {
                    errors.app_id = 'App ID is required.';
                } else if (!/^\d+$/.test(values.app_id)) {
                    errors.app_id = 'Please enter a valid app ID.';
                }

                if (!values.server) {
                    errors.server = 'Server is required.';
                }

                return errors;
            }}
            onSubmit={(values: EndpointProps, { setSubmitting }: FormikHelpers<EndpointProps>) => {
                localStorage.setItem('config.app_id', values.app_id);
                localStorage.setItem('config.server_url', values.server);
                setSubmitting(false);
                location.reload();
            }}
        >
            {({ errors, isSubmitting }) => (
                <div className='flex items-center justify-center mt-[200px]'>
                    <Form className='flex flex-col gap-20'>
                        <Text as='h1' size='xl' align='center'>
                            Endpoint Configuration
                        </Text>
                        <Field name='server'>
                            {({ field, form }: FieldProps) => (
                                <Input
                                    {...field}
                                    label='Server URL'
                                    type='text'
                                    error={!!form.errors.server}
                                    message='You can find your Server in the Developer Settings.'
                                />
                            )}
                        </Field>
                        <Field name='app_id'>
                            {({ field, form }: FieldProps) => (
                                <Input
                                    {...field}
                                    label='OAuth App ID'
                                    type='text'
                                    error={!!form.errors.app_id}
                                    message={
                                        <>
                                            Register an{' '}
                                            <a
                                                href='https://api.deriv.com/'
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-red-500 font-bold'
                                            >
                                                app ID
                                            </a>{' '}
                                            to use the above server for logging in.
                                        </>
                                    }
                                />
                            )}
                        </Field>
                        <Button
                            onClick={() => {
                                localStorage.removeItem('config.app_id');
                                localStorage.removeItem('config.server_url');
                                location.reload();
                            }}
                            variant='outlined'
                            color='black'
                        >
                            Reset Configuration
                        </Button>
                        <Button type='submit' disabled={!!errors.app_id || !!errors.server || isSubmitting}>
                            Save
                        </Button>
                    </Form>
                </div>
            )}
        </Formik>
    );
};
