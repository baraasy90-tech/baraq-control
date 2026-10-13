import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {useContracts} from '/src/features/contracts/api/useContract';
import {useContractPaymentsForProject} from '/src/features/budget/api/useContractPaymentsForProject';
import {useCompanyApprovals} from '/src/features/contracts/api/useCompanyApprovals';
function Result({companyId,projectId}:{companyId:string;projectId:string}) {
 const contracts=useContracts(projectId),payments=useContractPaymentsForProject(projectId),approvals=useCompanyApprovals(companyId);
 const queries=[contracts,payments,approvals];
 return <pre id="finance-result" data-state={queries.some(q=>q.isError)?'error':queries.some(q=>q.isPending)?'loading':'ready'}>{JSON.stringify({contracts:contracts.data?.length,payments:payments.data?.length,approvals:approvals.data?.filter(a=>a.projectId===projectId).length})}</pre>;
}
export function mount(companyId:string,projectId:string){const host=document.createElement('div');document.body.append(host);createRoot(host).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Result companyId={companyId} projectId={projectId}/></QueryClientProvider>);}
